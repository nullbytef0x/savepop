import { request } from "undici";
import { Readable } from "node:stream";
import { closeRequest, getHeaders, pipe } from "./shared.js";
import { handleHlsPlaylist, isHlsResponse, probeInternalHLSTunnel } from "./internal-hls.js";

// googlevideo rejects larger byte ranges for some media with a misleading 403.
const CHUNK_SIZE = 1024n * 1024n; // 1 MiB
const min = (a, b) => a < b ? a : b;

const serviceNeedsChunks = new Set(["youtube", "vk"]);

async function* readChunks(streamInfo, size) {
    let read = 0n, transplantAttempts = 0;
    while (read < size) {
        if (streamInfo.controller.signal.aborted) {
            throw new Error("controller aborted");
        }

        const chunkEnd = read + min(CHUNK_SIZE, size - read) - 1n;
        let chunkURL = streamInfo.url;
        const headers = {
            ...getHeaders(streamInfo.service),
            ...Object.fromEntries(streamInfo.headers || []),
        };

        if (streamInfo.service === 'youtube') {
            chunkURL = new URL(chunkURL);
            // googlevideo expects its query parameter and rejects equivalent
            // HTTP Range headers for later chunks on some media.
            chunkURL.searchParams.set('range', `${read}-${chunkEnd}`);
        } else {
            headers.Range = `bytes=${read}-${chunkEnd}`;
        }

        const chunk = await request(chunkURL, {
            headers,
            dispatcher: streamInfo.dispatcher,
            signal: streamInfo.controller.signal,
            maxRedirections: 4
        });

        if (chunk.statusCode === 403 && streamInfo.transplant && transplantAttempts < 3) {
            await chunk.body.dump().catch(() => {});
            transplantAttempts++;
            try {
                await streamInfo.transplant(streamInfo.dispatcher);
                continue;
            } catch {}
        }

        if (chunk.statusCode < 200 || chunk.statusCode > 299) {
            await chunk.body.dump().catch(() => {});
            throw new Error(`upstream returned ${chunk.statusCode}`);
        }
        transplantAttempts = 0;

        const expected = min(CHUNK_SIZE, size - read);
        const received = BigInt(chunk.headers['content-length'] || 0);

        if (received <= 0n || received < expected / 2n) {
            throw new Error('upstream returned an incomplete chunk');
        }

        for await (const data of chunk.body) {
            yield data;
        }

        read += received;
    }
}

async function handleChunkedStream(streamInfo, res) {
    const { signal } = streamInfo.controller;
    const cleanup = () => (res.end(), closeRequest(streamInfo.controller));

    try {
        let size, contentType, attempts = 3;

        if (streamInfo.service === 'youtube') {
            try {
                const mediaURL = new URL(streamInfo.url);
                const declaredSize = mediaURL.searchParams.get('clen');
                if (declaredSize && BigInt(declaredSize) > 0n) {
                    size = BigInt(declaredSize);
                    contentType = mediaURL.searchParams.get('mime');
                }
            } catch {}
        }

        while (attempts-- && !size) {
            let head;
            try {
                head = await fetch(streamInfo.url, {
                    headers: getHeaders(streamInfo.service),
                    method: 'HEAD',
                    dispatcher: streamInfo.dispatcher,
                    signal
                });
            } catch {}

            if (head?.status === 200) {
                const contentLength = head.headers.get('content-length');
                if (contentLength && BigInt(contentLength) > 0n) {
                    size = BigInt(contentLength);
                    contentType = head.headers.get('content-type');
                    streamInfo.url = head.url;
                    break;
                }
            }

            // googlevideo often rejects HEAD for longer media while accepting
            // byte ranges. A one-byte request gives us the total file size.
            let probe;
            try {
                probe = await fetch(streamInfo.url, {
                    headers: {
                        ...getHeaders(streamInfo.service),
                        Range: 'bytes=0-0'
                    },
                    dispatcher: streamInfo.dispatcher,
                    signal
                });

                const total = probe.headers.get('content-range')?.match(/\/(\d+)$/)?.[1];
                if (probe.status === 206 && total && BigInt(total) > 0n) {
                    size = BigInt(total);
                    contentType = probe.headers.get('content-type');
                    streamInfo.url = probe.url;
                }
            } catch {}
            finally {
                await probe?.body?.cancel().catch(() => {});
            }

            if (!size && streamInfo.transplant) {
                try {
                    await streamInfo.transplant(streamInfo.dispatcher);
                } catch {
                    break;
                }
            }
        }

        // Some valid googlevideo audio URLs omit `clen` and reject both HEAD
        // and tiny range probes. A regular streamed request still works for
        // these URLs, so let FFmpeg consume that instead of returning an
        // empty internal tunnel.
        if (!size) {
            return handleGenericStream(streamInfo, res);
        }

        const generator = readChunks(streamInfo, size);

        const abortGenerator = () => {
            generator.return();
            signal.removeEventListener('abort', abortGenerator);
        }

        signal.addEventListener('abort', abortGenerator);

        const stream = Readable.from(generator);

        if (contentType) res.setHeader('content-type', contentType);
        res.setHeader('content-length', size.toString());

        pipe(stream, res, cleanup);
    } catch {
        cleanup();
    }
}

async function handleGenericStream(streamInfo, res) {
    const { signal } = streamInfo.controller;
    const cleanup = () => res.end();

    try {
        let fileResponse;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                fileResponse = await request(streamInfo.url, {
                    headers: {
                        ...Object.fromEntries(streamInfo.headers),
                        host: undefined
                    },
                    dispatcher: streamInfo.dispatcher,
                    signal,
                    maxRedirections: 16
                });
            } catch (error) {
                if (attempt === 2) throw error;
                continue;
            }

            if (fileResponse.statusCode >= 200 && fileResponse.statusCode <= 299) {
                break;
            }
            if (attempt < 2) {
                await fileResponse.body.dump().catch(() => {});
                if (streamInfo.transplant) {
                    await streamInfo.transplant(streamInfo.dispatcher).catch(() => {});
                }
            }
        }
        if (!fileResponse) return cleanup();

        res.status(fileResponse.statusCode);
        fileResponse.body.on('error', () => {});

        const isHls = isHlsResponse(fileResponse, streamInfo);

        for (const [ name, value ] of Object.entries(fileResponse.headers)) {
            if (!isHls || name.toLowerCase() !== 'content-length') {
                res.setHeader(name, value);
            }
        }

        if (fileResponse.statusCode < 200 || fileResponse.statusCode > 299) {
            return cleanup();
        }

        if (isHls) {
            await handleHlsPlaylist(streamInfo, fileResponse, res);
        } else {
            pipe(fileResponse.body, res, cleanup);
        }
    } catch {
        closeRequest(streamInfo.controller);
        cleanup();
    }
}

export function internalStream(streamInfo, res) {
    if (streamInfo.headers) {
        streamInfo.headers.delete('icy-metadata');
    }

    if (serviceNeedsChunks.has(streamInfo.service) && !streamInfo.isHLS) {
        return handleChunkedStream(streamInfo, res);
    }

    return handleGenericStream(streamInfo, res);
}

export async function probeInternalTunnel(streamInfo) {
    try {
        const signal = AbortSignal.timeout(3000);
        const headers = {
            ...Object.fromEntries(streamInfo.headers || []),
            ...getHeaders(streamInfo.service),
            host: undefined,
            range: undefined
        };

        if (streamInfo.isHLS) {
            return probeInternalHLSTunnel({
                ...streamInfo,
                signal,
                headers
            });
        }

        const response = await request(streamInfo.url, {
            method: 'HEAD',
            headers,
            dispatcher: streamInfo.dispatcher,
            signal,
            maxRedirections: 16
        });

        if (response.statusCode !== 200)
            throw "status is not 200 OK";

        const size = +response.headers['content-length'];
        if (isNaN(size))
            throw "content-length is not a number";

        return size;
    } catch {}
}
