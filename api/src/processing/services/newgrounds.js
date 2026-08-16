import { genericUserAgent } from "../../config.js";
import { argon2id } from "hash-wasm";

const guardBaseURL = "https://www.newgrounds.com";
const cachedGuard = {
    cookie: "",
    expiry: 0,
};

const leadingZeroBits = bytes => {
    let bits = 0;
    for (const byte of bytes) {
        if (byte === 0) {
            bits += 8;
            continue;
        }
        bits += Math.clz32(byte) - 24;
        break;
    }
    return bits;
}

const solveGuardChallenge = async challenge => {
    const payload = Buffer.from(challenge.payload, 'base64url');
    const started = Date.now();

    for (let nonce = 0; nonce < 100000; nonce++) {
        const password = Buffer.concat([
            payload,
            Buffer.from(':'),
            Buffer.from(String(nonce)),
        ]);
        let hash;

        if (challenge.algo === 'argon2id') {
            hash = await argon2id({
                password,
                salt: new Uint8Array(8),
                parallelism: challenge.params.parallelism,
                iterations: challenge.params.iterations,
                memorySize: challenge.params.memorySize,
                hashLength: challenge.params.hashLength,
                outputType: 'binary',
            });
        } else {
            hash = new Uint8Array(await crypto.subtle.digest('SHA-256', password));
        }

        if (leadingZeroBits(hash) >= challenge.bits) {
            return {
                nonce: String(nonce),
                solveTimeMs: Date.now() - started,
            };
        }

        if (Date.now() - started > 30000) break;
    }
}

const getGuardCookie = async (refresh = false) => {
    if (!refresh && cachedGuard.cookie && cachedGuard.expiry > Date.now()) {
        return cachedGuard.cookie;
    }

    try {
        const challengeResponse = await fetch(`${guardBaseURL}/_guard/api/v1/challenge`, {
            headers: { 'user-agent': genericUserAgent },
            signal: AbortSignal.timeout(10000),
        });
        if (!challengeResponse.ok) return;

        const challenge = await challengeResponse.json();
        const solution = await solveGuardChallenge(challenge);
        if (!solution) return;

        const verifyResponse = await fetch(`${guardBaseURL}/_guard/api/v1/verify`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'user-agent': genericUserAgent,
            },
            body: JSON.stringify({
                algo: challenge.algo,
                bits: challenge.bits,
                nonce: solution.nonce,
                params: challenge.algo === 'argon2id' ? challenge.params : undefined,
                payload: challenge.payload,
                sig: challenge.sig,
                solveTimeMs: solution.solveTimeMs,
                demo: false,
            }),
            signal: AbortSignal.timeout(10000),
        });
        if (!verifyResponse.ok) return;
        const verification = await verifyResponse.json();
        if (!verification?.ok) return;

        const setCookie = verifyResponse.headers.get('set-cookie');
        const cookie = setCookie?.split(';', 1)?.[0];

        // NG Guard currently authorizes the verified network session and
        // returns a token in JSON rather than a cookie. Retain a marker so we
        // don't solve another challenge until that short session expires.
        cachedGuard.cookie = cookie || 'verified';
        cachedGuard.expiry = Date.now() + Number(verification.expiresIn || 180) * 1000;
        return cachedGuard.cookie;
    } catch {}
}

const guardedFetch = async (url, options = {}) => {
    for (let attempt = 0; attempt < 2; attempt++) {
        const guardSession = await getGuardCookie(attempt > 0);
        if (!guardSession) return;

        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                ...(guardSession !== 'verified' && { cookie: guardSession }),
            },
            signal: AbortSignal.timeout(15000),
        }).catch(() => {});

        if (response?.status !== 403) return response;
        cachedGuard.cookie = '';
    }
}

const getVideo = async ({ id, quality }) => {
    const json = await guardedFetch(`https://www.newgrounds.com/portal/video/${id}`, {
        headers: {
            "User-Agent": genericUserAgent,
            "X-Requested-With": "XMLHttpRequest", // required to get the JSON response
        }
    })
    .then(r => r?.ok ? r.json() : undefined)
    .catch(() => {});

    if (!json) return { error: "fetch.empty" };

    const videoSources = json.sources;
    const videoQualities = Object.keys(videoSources);

    if (videoQualities.length === 0) {
        return { error: "fetch.empty" };
    }

    const bestVideo = videoSources[videoQualities[0]]?.[0],
          userQuality = quality === "2160" ? "4k" : `${quality}p`,
          preferredVideo = videoSources[userQuality]?.[0],
          video = preferredVideo || bestVideo,
          videoQuality = preferredVideo ? userQuality : videoQualities[0];

    if (!bestVideo || !video.type.includes("mp4")) {
        return { error: "fetch.empty" };
    }

    const fileMetadata = {
        title: decodeURIComponent(json.title),
        artist: decodeURIComponent(json.author),
    }

    return {
        urls: video.src,
        filenameAttributes: {
            service: "newgrounds",
            id,
            title: fileMetadata.title,
            author: fileMetadata.artist,
            extension: "mp4",
            qualityLabel: videoQuality,
            resolution: videoQuality,
        },
        fileMetadata,
    }
}

const getMusic = async ({ id }) => {
    const html = await guardedFetch(`https://www.newgrounds.com/audio/listen/${id}`, {
        headers: {
            "User-Agent": genericUserAgent,
        }
    })
    .then(r => r?.ok ? r.text() : undefined)
    .catch(() => {});

    if (!html) return { error: "fetch.fail" };

    let params;
    try {
        params = JSON.parse(
            `{${html.split(',"params":{')[1]?.split(',"images":')[0]}}`
        );
    } catch {}
    if (!params) return { error: "fetch.empty" };

    if (!params.name || !params.artist || !params.filename || !params.icon) {
        return { error: "fetch.empty" };
    }

    const fileMetadata = {
        title: decodeURIComponent(params.name),
        artist: decodeURIComponent(params.artist),
    }

    return {
        urls: params.filename,
        filenameAttributes: {
            service: "newgrounds",
            id,
            title: fileMetadata.title,
            author: fileMetadata.artist,
        },
        fileMetadata,
        cover:
            params.icon.includes(".png?") || params.icon.includes(".jpg?")
                ? params.icon
                : undefined,
        isAudioOnly: true,
        bestAudio: "mp3",
    }
}

export default function({ id, audioId, quality }) {
    if (id) {
        return getVideo({ id, quality });
    } else if (audioId) {
        return getMusic({ id: audioId });
    }

    return { error: "fetch.empty" };
}
