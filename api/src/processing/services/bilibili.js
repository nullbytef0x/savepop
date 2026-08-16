import { env } from "../../config.js";
import { resolveRedirectingURL } from "../url.js";

// TO-DO: higher quality downloads (currently requires an account)

function getBest(content) {
    return content?.filter(v => v.baseUrl || v.url)
                .map(v => {
                    const candidates = [v.baseUrl, v.url, ...(v.backupUrl || [])]
                        .filter(Boolean);
                    v.baseUrl = candidates.find(url => {
                        try {
                            return new URL(url).hostname.endsWith(".bilivideo.com");
                        } catch {
                            return false;
                        }
                    }) || candidates[0];
                    return v;
                })
                .reduce((a, b) => a?.bandwidth > b?.bandwidth ? a : b);
}

function extractBestQuality(dashData) {
    const bestVideo = getBest(dashData.video),
          bestAudio = getBest(dashData.audio);

    if (!bestVideo || !bestAudio) return [];
    return [ bestVideo, bestAudio ];
}

async function com_download(id, partId) {
    const headers = {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36",
        "referer": "https://www.bilibili.com/",
    };
    const idParams = id.startsWith('BV')
        ? { bvid: id }
        : { aid: id.replace(/^av/, '') };
    const viewURL = new URL('https://api.bilibili.com/x/web-interface/view');
    for (const [key, value] of Object.entries(idParams)) {
        viewURL.searchParams.set(key, value);
    }

    const view = await fetch(viewURL, { headers })
        .then(r => r.ok ? r.json() : undefined)
        .catch(() => {});

    if (view?.code !== 0 || !view.data) return { error: "fetch.empty" };
    if (view.data.duration > env.durationLimit) {
        return { error: "content.too_long" };
    }

    const pageIndex = Math.max(Number(partId || 1) - 1, 0);
    const cid = view.data.pages?.[pageIndex]?.cid || view.data.cid;
    if (!cid) return { error: "fetch.empty" };

    const playURL = new URL('https://api.bilibili.com/x/player/playurl');
    for (const [key, value] of Object.entries({
        ...idParams,
        cid,
        qn: 64,
        fnval: 4048,
        fourk: 1,
    })) {
        playURL.searchParams.set(key, value);
    }

    const streamData = await fetch(playURL, { headers })
        .then(r => r.ok ? r.json() : undefined)
        .catch(() => {});

    const dash = streamData?.data?.dash;
    if (streamData?.code !== 0 || !dash) return { error: "fetch.empty" };

    const compatibleVideo = dash.video?.filter(video =>
        video.codecs?.startsWith('avc') || video.codecid === 7
    );
    const [ video, audio ] = extractBestQuality({
        video: compatibleVideo?.length ? compatibleVideo : dash.video,
        audio: dash.audio,
    });
    if (!video || !audio) {
        return { error: "fetch.empty" };
    }

    let filenameBase = `bilibili_${id}`;
    if (partId) {
        filenameBase += `_${partId}`;
    }

    return {
        urls: [video.baseUrl, audio.baseUrl],
        headers,
        audioFilename: `${filenameBase}_audio`,
        filename: `${filenameBase}_${video.width}x${video.height}.mp4`,
    };
}

async function tv_download(id) {
    const headers = {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36",
        "referer": "https://www.bilibili.tv/",
    };
    const url = new URL(
        'https://api.bilibili.tv/intl/gateway/web/playurl'
        + '?s_locale=en_US&platform=web&qn=64&type=0&device=wap'
        + '&tf=0&spm_id=bstar-web.ugc-video-detail.0.0&from_spm_id='
    );

    url.searchParams.set('aid', id);

    const { data } = await fetch(url, { headers }).then(a => a.json());
    if (!data?.playurl?.video) {
        return { error: "fetch.empty" };
    }

    const [ video, audio ] = extractBestQuality({
        video: data.playurl.video.map(s => s.video_resource)
                                 .filter(s => s.codecs.includes('avc1')),
        audio: data.playurl.audio_resource
    });

    if (!video || !audio) {
        return { error: "fetch.empty" };
    }

    if (video.duration > env.durationLimit * 1000) {
        return { error: "content.too_long" };
    }

    return {
        urls: [video.url, audio.url],
        headers,
        audioFilename: `bilibili_tv_${id}_audio`,
        filename: `bilibili_tv_${id}.mp4`
    };
}

export default async function({ comId, tvId, comShortLink, partId }) {
    if (comShortLink) {
        const patternMatch = await resolveRedirectingURL(`https://b23.tv/${comShortLink}`);
        comId = patternMatch?.comId;
    }

    if (comId) {
        return com_download(comId, partId);
    } else if (tvId) {
        return tv_download(tvId);
    }

    return { error: "fetch.fail" };
}
