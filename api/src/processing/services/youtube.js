import { execFile, spawn } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { env } from "../../config.js";

const execFileAsync = promisify(execFile);

const videoQualities = [144, 240, 360, 480, 720, 1080, 1440, 2160, 4320];
const directProtocols = new Set(["http", "https"]);

const codecList = {
    h264: {
        video: codec => codec?.toLowerCase().startsWith("avc1"),
        audio: codec => codec?.toLowerCase().startsWith("mp4a"),
        container: "mp4",
    },
    av1: {
        video: codec => codec?.toLowerCase().startsWith("av01"),
        audio: codec => codec?.toLowerCase().startsWith("opus"),
        container: "webm",
    },
    vp9: {
        video: codec => /^(vp9|vp09)/i.test(codec || ""),
        audio: codec => codec?.toLowerCase().startsWith("opus"),
        container: "webm",
    },
};

let activeExtractions = 0;
const extractionWaiters = [];

const acquireExtractionSlot = async () => {
    const limit = Math.max(1, env.ytDlpConcurrency);
    if (activeExtractions >= limit) {
        await new Promise(resolve => extractionWaiters.push(resolve));
    }
    activeExtractions++;
};

const releaseExtractionSlot = () => {
    activeExtractions--;
    extractionWaiters.shift()?.();
};

const withExtractionSlot = async fn => {
    await acquireExtractionSlot();
    try {
        return await fn();
    } finally {
        releaseExtractionSlot();
    }
};

const rawCookieHeaderToNetscape = header => {
    const lines = [];

    for (const item of header.split(/;\s*/)) {
        const separator = item.indexOf("=");
        if (separator <= 0) continue;

        const name = item.slice(0, separator).trim();
        const value = item.slice(separator + 1).trim();
        if (!name || /[\s;=]/.test(name) || /[\r\n\t]/.test(value)) continue;

        lines.push(`.youtube.com\tTRUE\t/\tTRUE\t0\t${name}\t${value}`);
    }

    if (!lines.length) {
        throw new Error("youtube cookie data contains no valid cookies");
    }

    return `# Netscape HTTP Cookie File\n${lines.join("\n")}\n`;
};

export const cookieSourceToNetscape = source => {
    const contents = String(source || "").trim();
    if (!contents) throw new Error("youtube cookie file is empty");

    if (contents.startsWith("{")) {
        let parsed;
        try {
            parsed = JSON.parse(contents);
        } catch {
            throw new Error("youtube cookie JSON is invalid");
        }

        const header = parsed?.youtube?.find?.(value =>
            typeof value === "string" && value.trim()
        );
        if (!header) {
            throw new Error("youtube cookie JSON has no youtube cookie entry");
        }

        return rawCookieHeaderToNetscape(header);
    }

    const hasNetscapeRecords = contents.split(/\r?\n/).some(line =>
        !line.startsWith("#") && line.split("\t").length >= 7
    );
    if (!hasNetscapeRecords) {
        throw new Error("youtube cookie file must be Cobalt JSON or Netscape format");
    }

    return `${contents}\n`;
};

const makeCookieJarCopy = async () => {
    if (!env.ytDlpCookiesPath) return {};

    const directory = await mkdtemp(join(tmpdir(), "savepop-ytdlp-"));
    const path = join(directory, "cookies.txt");

    try {
        const source = await readFile(env.ytDlpCookiesPath, "utf8");
        await writeFile(path, cookieSourceToNetscape(source), { mode: 0o600 });
        await chmod(path, 0o600);
        return { directory, path };
    } catch (error) {
        await rm(directory, { recursive: true, force: true }).catch(() => {});
        throw error;
    }
};

export const spawnYtDlpFormat = async (id, formatId) => {
    if (!/^[\w-]{11}$/.test(id) || !/^[\w.+-]+$/.test(formatId || "")) {
        throw new Error("invalid youtube download parameters");
    }

    const cookieJar = await makeCookieJarCopy();
    const args = [
        "--ignore-config",
        "--no-playlist",
        "--quiet",
        "--no-warnings",
        "--no-progress",
        "--retries", "10",
        "--fragment-retries", "10",
        "--socket-timeout", "20",
        "--cache-dir", join(tmpdir(), "savepop-yt-dlp-cache"),
        "--js-runtimes", `node:${process.execPath}`,
    ];

    if (cookieJar.path) {
        args.push("--cookies", cookieJar.path);
    }

    if (env.ytDlpPotProviderURL) {
        args.push(
            "--extractor-args",
            `youtubepot-bgutilhttp:base_url=${env.ytDlpPotProviderURL}`,
        );
    }

    args.push(
        "--format", formatId,
        "--output", "-",
        `https://www.youtube.com/watch?v=${id}`,
    );

    const child = spawn(env.ytDlpPath, args, {
        env: { ...process.env, NO_COLOR: "1" },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
    });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", chunk => {
        stderr = `${stderr}${chunk}`.slice(-8192);
    });

    const cleanup = () => {
        if (cookieJar.directory) {
            rm(cookieJar.directory, { recursive: true, force: true }).catch(() => {});
        }
    };
    child.once("close", cleanup);
    child.once("error", cleanup);

    return {
        process: child,
        stream: child.stdout,
        error: () => cleanError(stderr),
        cleanup,
    };
};

const cleanError = value => String(value || "")
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .slice(-3)
    .join(" | ")
    .slice(0, 1000);

export const mapYtDlpError = value => {
    const message = String(value || "").toLowerCase();

    if (message.includes("private video")) return "content.video.private";
    if (message.includes("confirm your age") || message.includes("age-restricted")) {
        return "content.video.age";
    }
    if (message.includes("not available in your country") || message.includes("geo-restricted")) {
        return "content.video.region";
    }
    if (message.includes("drm protected") || message.includes("drm-protected")) {
        return "youtube.drm";
    }
    if (message.includes("sign in to confirm you're not a bot")
        || message.includes("sign in to confirm you’re not a bot")
        || message.includes("cookies are no longer valid")) {
        return "youtube.login";
    }
    if (message.includes("requested format is not available")) {
        return "youtube.no_matching_format";
    }
    if (message.includes("incomplete youtube id") || message.includes("invalid youtube id")) {
        return "link.unsupported";
    }
    if (message.includes("too many requests") || message.includes("http error 429")) {
        return "fetch.rate";
    }
    if (message.includes("video unavailable") || message.includes("this video is unavailable")) {
        return "content.video.unavailable";
    }

    return "youtube.api_error";
};

export const getYtDlpJSON = async (url, extraArgs = []) => withExtractionSlot(async () => {
    let cookieJar;

    try {
        cookieJar = await makeCookieJarCopy();

        const args = [
            "--ignore-config",
            "--dump-single-json",
            "--skip-download",
            "--no-warnings",
            "--no-progress",
            "--cache-dir", join(tmpdir(), "savepop-yt-dlp-cache"),
            "--js-runtimes", `node:${process.execPath}`,
            ...extraArgs,
        ];

        if (cookieJar.path) {
            args.push("--cookies", cookieJar.path);
        }

        if (env.ytDlpPotProviderURL) {
            args.push(
                "--extractor-args",
                `youtubepot-bgutilhttp:base_url=${env.ytDlpPotProviderURL}`,
            );
        }

        args.push(url);

        const { stdout } = await execFileAsync(env.ytDlpPath, args, {
            encoding: "utf8",
            env: { ...process.env, NO_COLOR: "1" },
            maxBuffer: 32 * 1024 * 1024,
            timeout: env.ytDlpTimeout,
            windowsHide: true,
        });

        return { info: JSON.parse(stdout) };
    } catch (error) {
        const details = cleanError(error.stderr || error.message);
        console.error(`[youtube/yt-dlp] extraction failed: ${details || "unknown error"}`);
        return { error: mapYtDlpError(error.stderr || error.message) };
    } finally {
        if (cookieJar?.directory) {
            await rm(cookieJar.directory, { recursive: true, force: true }).catch(() => {});
        }
    }
});

const getYtDlpInfo = id => getYtDlpJSON(
    `https://www.youtube.com/watch?v=${id}`,
    ["--no-playlist"],
);

export const normalizeQuality = format => {
    const dimensions = [format?.width, format?.height].filter(Number.isFinite);
    if (!dimensions.length) return;

    const shortestSide = Math.min(...dimensions);
    return videoQualities.find(quality => quality >= shortestSide)
        || videoQualities.at(-1);
};

const isDirectFormat = format => Boolean(
    format?.url
    && directProtocols.has(format.protocol)
    && !format.has_drm
);

const isVideoOnly = format => isDirectFormat(format)
    && format.vcodec && format.vcodec !== "none"
    && (!format.acodec || format.acodec === "none");

const isAudioOnly = format => isDirectFormat(format)
    && format.acodec && format.acodec !== "none"
    && (!format.vcodec || format.vcodec === "none");

const formatBitrate = format => Number(format.tbr || format.vbr || format.abr || 0);

const sortVideoFormats = (a, b) => (
    (normalizeQuality(b) || 0) - (normalizeQuality(a) || 0)
    || Number(b.height || 0) - Number(a.height || 0)
    || formatBitrate(b) - formatBitrate(a)
);

const isDrc = format => String(format.format_id || "").endsWith("-drc")
    || /\bdrc\b/i.test(format.format_note || "");

const sortAudioFormats = (a, b) => (
    Number(isDrc(a)) - Number(isDrc(b))
    || Number(b.language_preference || 0) - Number(a.language_preference || 0)
    || formatBitrate(b) - formatBitrate(a)
);

const languageMatches = (format, language) => {
    if (!language || !format?.language) return false;
    const preferred = language.toLowerCase();
    const actual = format.language.toLowerCase();
    return actual === preferred || actual.startsWith(`${preferred}-`);
};

const chooseVideo = (formats, quality, selectedId) => {
    if (selectedId) {
        const selected = formats.find(format => format.format_id === selectedId);
        if (selected) return selected;
    }

    formats.sort(sortVideoFormats);
    if (quality === "max") return formats[0];

    const requested = Number(quality);
    return formats.find(format => normalizeQuality(format) === requested)
        || formats.find(format => normalizeQuality(format) < requested)
        || formats.at(-1);
};

const chooseAudio = (formats, requestedLanguage, originalLanguage, selectedId) => {
    if (selectedId) {
        const selected = formats.find(format => format.format_id === selectedId);
        if (selected) return selected;
    }

    formats.sort(sortAudioFormats);

    if (requestedLanguage) {
        const dubbed = formats.find(format => languageMatches(format, requestedLanguage));
        if (dubbed) return dubbed;
    }

    return formats.find(format => languageMatches(format, originalLanguage))
        || formats.find(format => /\boriginal\b/i.test(format.format_note || ""))
        || formats[0];
};

export const selectFormats = (info, options) => {
    const allFormats = info.formats || [];
    const requestedCodec = options.codec || "h264";
    const codecOrder = requestedCodec === "h264"
        ? ["h264", "vp9", "av1"]
        : [requestedCodec, requestedCodec === "av1" ? "vp9" : "av1", "h264"];

    for (const codec of codecOrder) {
        const videoFormats = allFormats.filter(format =>
            isVideoOnly(format) && codecList[codec].video(format.vcodec)
        );

        let audioFormats = allFormats.filter(format =>
            isAudioOnly(format) && codecList[codec].audio(format.acodec)
        );
        if (!audioFormats.length) {
            audioFormats = allFormats.filter(isAudioOnly);
        }

        const video = options.isAudioOnly
            ? undefined
            : chooseVideo(videoFormats, options.quality, options.formatIds?.video);
        const audio = chooseAudio(
            audioFormats,
            options.dubLang,
            info.language,
            options.formatIds?.audio,
        );

        if ((options.isAudioOnly && audio) || (video && audio)) {
            return { video, audio, codec };
        }
    }

    return {};
};

const chooseSubtitles = (info, language) => {
    if (!language) return;

    const manualSubtitles = info.subtitles || {};
    const automaticSubtitles = info.automatic_captions || {};
    const key = Object.keys(manualSubtitles).find(code =>
        code === language || code.startsWith(`${language}-`)
    ) || Object.keys(automaticSubtitles).find(code =>
        code === language || code.startsWith(`${language}-`)
    );
    if (!key) return;

    const formats = manualSubtitles[key] || automaticSubtitles[key] || [];
    const subtitle = formats.find(format => format.ext === "vtt" && format.url)
        || formats.find(format => format.url);

    if (!subtitle) return;
    return {
        language: key,
        url: subtitle.url,
        extension: subtitle.ext || "vtt",
    };
};

const normalizeDate = value => {
    if (!/^\d{8}$/.test(value || "")) return value;
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
};

const getFileMetadata = info => {
    const artist = String(info.artist || info.uploader || info.channel || "youtube")
        .replace(/- Topic$/, "")
        .trim();

    const metadata = {
        title: String(info.track || info.title || "youtube video").trim(),
        artist,
    };

    if (info.album) metadata.album = String(info.album);
    if (info.release_date || info.upload_date) {
        metadata.date = normalizeDate(info.release_date || info.upload_date);
    }

    if (info.description?.startsWith("Provided to YouTube by")) {
        const items = info.description.split("\n\n", 5);
        if (!metadata.album && items.length >= 3) metadata.album = items[2];
        if (items.length >= 4) metadata.copyright = items[3];
    }

    return metadata;
};

const audioExtension = format => {
    if (format?.acodec?.startsWith("opus")) return "opus";
    if (format?.ext === "m4a" || format?.acodec?.startsWith("mp4a")) return "m4a";
    return format?.ext;
};

const formatSize = format => Number(format?.filesize || format?.filesize_approx || 0);

const safeHeaders = headers => {
    const allowed = new Set(["accept", "accept-language", "origin", "referer", "user-agent"]);
    return Object.fromEntries(
        Object.entries(headers || {}).filter(([name]) => allowed.has(name.toLowerCase()))
    );
};

export default async function (options) {
    if (!/^[\w-]{11}$/.test(options.id)) {
        return { error: "link.unsupported" };
    }

    const extracted = await getYtDlpInfo(options.id);
    if (extracted.error) return extracted;

    const info = extracted.info;
    if (!info || info.id !== options.id) {
        return { error: "fetch.fail", critical: true };
    }
    if (info.is_live || ["is_live", "is_upcoming"].includes(info.live_status)) {
        return { error: "content.video.live" };
    }
    if (Number(info.duration || 0) > env.durationLimit) {
        return { error: "content.too_long" };
    }

    const selected = selectFormats(info, options);
    if (!selected.audio || (!options.isAudioOnly && !selected.video)) {
        if ((info.formats || []).some(format => format.has_drm)) {
            return { error: "youtube.drm" };
        }
        return { error: "youtube.no_matching_format" };
    }

    const selectedSubtitles = !options.isAudioOnly
        ? chooseSubtitles(info, options.subtitleLang)
        : undefined;
    const fileMetadata = getFileMetadata(info);
    if (selectedSubtitles && options.subtitleMode !== "separate") {
        fileMetadata.sublanguage = selectedSubtitles.language;
    }

    const selectedLanguage = selected.audio.language;
    const dubbedLanguage = options.dubLang && languageMatches(selected.audio, options.dubLang)
        && !languageMatches(selected.audio, info.language)
        ? selectedLanguage
        : undefined;

    const filenameAttributes = {
        service: "youtube",
        id: options.id,
        title: fileMetadata.title,
        author: fileMetadata.artist,
        youtubeDubName: dubbedLanguage || false,
    };

    const originalRequest = {
        ...options,
        dispatcher: undefined,
        formatIds: {
            video: selected.video?.format_id,
            audio: selected.audio.format_id,
        },
    };

    const headers = safeHeaders(
        selected.video?.http_headers || selected.audio.http_headers || info.http_headers
    );

    if (options.isAudioOnly) {
        const convertedAudioSize = Number(info.duration || 0)
            * Number(options.audioBitrate || 128) * 1000 / 8;
        return {
            type: "audio",
            isAudioOnly: true,
            urls: selected.audio.url,
            estimatedSize: Math.round(convertedAudioSize) || formatSize(selected.audio),
            filenameAttributes,
            fileMetadata,
            bestAudio: audioExtension(selected.audio),
            isHLS: false,
            originalRequest,
            headers,
            cover: info.thumbnail,
            cropCover: String(info.channel || info.uploader || "").endsWith("- Topic"),
        };
    }

    const resolution = normalizeQuality(selected.video);
    filenameAttributes.resolution = `${selected.video.width}x${selected.video.height}`;
    filenameAttributes.qualityLabel = `${resolution}p`;
    filenameAttributes.youtubeFormat = selected.codec;
    filenameAttributes.extension = options.container === "auto"
        ? codecList[selected.codec].container
        : options.container;

    return {
        type: "merge",
        urls: [selected.video.url, selected.audio.url],
        estimatedSize: formatSize(selected.video) + formatSize(selected.audio),
        subtitles: options.subtitleMode !== "separate"
            ? selectedSubtitles?.url
            : undefined,
        separateSubtitles: options.subtitleMode === "separate"
            ? selectedSubtitles
            : undefined,
        filenameAttributes,
        fileMetadata,
        isHLS: false,
        originalRequest,
        headers,
    };
}
