import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import HLS from "hls-parser";

import { env } from "../../config.js";
import { merge } from "../../misc/utils.js";

const execFileAsync = promisify(execFile);
const impersonatedFetchScript = fileURLToPath(
    new URL("../../util/fetch-vimeo-player.py", import.meta.url)
);

const resolutionMatch = {
    3840: 2160,
    2732: 1440,
    2560: 1440,
    2048: 1080,
    1920: 1080,
    1366: 720,
    1280: 720,
    960: 480,
    640: 360,
    426: 240,
};

const playerHeaders = {
    Accept: "text/html,application/xhtml+xml",
    "Accept-Encoding": "identity",
    Referer: "https://vimeo.com/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
};

const isPlayerConfig = text => text?.includes("window.playerConfig");

const fetchPlayerPage = async url => {
    let page;

    try {
        const response = await fetch(url, {
            headers: playerHeaders,
            signal: AbortSignal.timeout(15_000),
        });
        if (response.ok) page = await response.text();
    } catch {}

    if (isPlayerConfig(page)) return page;

    try {
        const python = process.env.VIMEO_IMPERSONATE_PYTHON || "python3";
        const { stdout } = await execFileAsync(
            python,
            [impersonatedFetchScript, url],
            {
                encoding: "utf8",
                maxBuffer: 3 * 1024 * 1024,
                timeout: 35_000,
            }
        );
        if (isPlayerConfig(stdout)) return stdout;
    } catch {}
};

const getPlayerURL = async (id, hash) => {
    const query = new URLSearchParams({ clip_id: id });
    if (hash) query.set("hash", hash);

    try {
        const response = await fetch(
            `https://vimeo.com/_next/clip_metadata?${query}`,
            {
                headers: {
                    Accept: "application/json",
                    "User-Agent": playerHeaders["User-Agent"],
                },
                signal: AbortSignal.timeout(15_000),
            }
        );
        if (response.ok) {
            const metadata = await response.json();
            const playerTag = metadata.meta?.find(tag =>
                tag.name === "twitter:player" || tag.property === "og:video:url"
            );
            if (playerTag?.content) return playerTag.content;
        }
    } catch {}

    const fallback = new URL(`https://player.vimeo.com/video/${id}`);
    if (hash) fallback.searchParams.set("h", hash);
    return fallback.toString();
};

const parsePlayerConfig = page => {
    const marker = "window.playerConfig";
    const markerIndex = page.indexOf(marker);
    if (markerIndex === -1) return;

    const jsonStart = page.indexOf("{", markerIndex + marker.length);
    const scriptEnd = page.indexOf("</script>", jsonStart);
    if (jsonStart === -1 || scriptEnd === -1) return;

    try {
        return JSON.parse(page.slice(jsonStart, scriptEnd).replace(/;\s*$/, ""));
    } catch {}
};

const qualityDistance = (candidate, requested) =>
    Math.abs(Number(candidate) - Number(requested));

const findSubtitle = (config, subtitleLang) => {
    if (!subtitleLang) return;
    const track = config.request?.text_tracks?.find(item =>
        item.lang?.toLowerCase().startsWith(subtitleLang.toLowerCase())
    );
    if (!track?.url) return;
    return new URL(track.url, "https://player.vimeo.com/").toString();
};

const getProgressive = (config, quality, subtitleLang) => {
    const progressive = config.request?.files?.progressive;
    if (!Array.isArray(progressive) || progressive.length === 0) return;

    const match = [...progressive].reduce((previous, current) => {
        const previousQuality = parseInt(previous.quality) || previous.height;
        const currentQuality = parseInt(current.quality) || current.height;
        return qualityDistance(previousQuality, quality) <= qualityDistance(currentQuality, quality)
            ? previous
            : current;
    });
    if (!match?.url) return;

    return {
        urls: match.url,
        subtitles: findSubtitle(config, subtitleLang),
        filenameAttributes: {
            resolution: `${match.width}x${match.height}`,
            qualityLabel: match.quality || `${match.height}p`,
            extension: "mp4",
        },
        bestAudio: "mp3",
    };
};

const getHLS = async (config, quality, isAudioOnly) => {
    const hls = config.request?.files?.hls;
    const cdn = hls?.cdns?.[hls.default_cdn] || Object.values(hls?.cdns || {})[0];
    const masterURL = cdn?.avc_url || cdn?.url;
    if (!masterURL) return { error: "fetch.fail" };

    let master;
    for (let attempt = 0; attempt < 3 && !master; attempt++) {
        try {
            const response = await fetch(masterURL, {
                signal: AbortSignal.timeout(15_000),
            });
            if (response.ok) master = await response.text();
        } catch {}
    }
    if (!master) return { error: "fetch.fail" };

    const variants = HLS.parse(master)?.variants;
    if (!variants?.length) return { error: "fetch.empty" };

    const variantQuality = variant =>
        resolutionMatch[variant.resolution?.width] || variant.resolution?.height || 0;

    let selected = [...variants].sort(
        (a, b) => Number(b.bandwidth) - Number(a.bandwidth)
    )[0];

    if (quality < 9000) {
        selected = variants.reduce((previous, current) =>
            qualityDistance(variantQuality(previous), quality) <= qualityDistance(variantQuality(current), quality)
                ? previous
                : current
        );
    }

    const expand = path => new URL(path, masterURL).toString();
    const audioPath = selected.audio?.[0]?.uri;
    if (isAudioOnly && !audioPath) return { error: "fetch.empty" };

    return {
        urls: audioPath
            ? [expand(selected.uri), expand(audioPath)]
            : expand(selected.uri),
        isHLS: true,
        filenameAttributes: {
            resolution: `${selected.resolution?.width}x${selected.resolution?.height}`,
            qualityLabel: `${variantQuality(selected)}p`,
            extension: "mp4",
        },
        bestAudio: "mp3",
    };
};

export default async function(obj) {
    let quality = obj.quality === "max" ? 9000 : Number(obj.quality);
    if (quality < 240) quality = 240;
    if (!quality || obj.isAudioOnly) quality = 9000;

    const playerURL = await getPlayerURL(obj.id, obj.password);
    const page = await fetchPlayerPage(playerURL);
    const config = page && parsePlayerConfig(page);
    if (!config?.video || !config.request?.files) return { error: "fetch.fail" };

    if (config.video.duration > env.durationLimit) {
        return { error: "content.too_long" };
    }

    let response;
    if (!obj.isAudioOnly) {
        response = getProgressive(config, quality, obj.subtitleLang);
    }
    if (!response) response = await getHLS(config, quality, obj.isAudioOnly);
    if (response.error) return response;

    const fileMetadata = {
        title: config.video.title,
        artist: config.video.owner?.name,
    };
    if (response.subtitles) fileMetadata.sublanguage = obj.subtitleLang;

    return merge(
        {
            fileMetadata,
            filenameAttributes: {
                service: "vimeo",
                id: obj.id,
                title: fileMetadata.title,
                author: fileMetadata.artist,
            },
        },
        response
    );
}
