import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { resolveRedirectingURL } from "../url.js";
import { genericUserAgent, env } from "../../config.js";
import { getCookie, updateCookieValues } from "../cookie/manager.js";
import { createStream } from "../../stream/manage.js";

const execFileAsync = promisify(execFile);

async function getAccessToken() {
    /* "cookie" in cookiefile needs to contain:
     * client_id, client_secret, refresh_token
     * e.g. client_id=bla; client_secret=bla; refresh_token=bla
     *
     * you can get these by making a reddit app and
     * authenticating an account against reddit's oauth2 api
     * see: https://github.com/reddit-archive/reddit/wiki/OAuth2
     *
     * any additional cookie fields are managed by this code and you
     * should not touch them unless you know what you're doing. **/
    const cookie = await getCookie('reddit');
    if (!cookie) return;

    const values = cookie.values(),
          needRefresh = !values.access_token
                        || !values.expiry
                        || Number(values.expiry) < new Date().getTime();
    if (!needRefresh) return values.access_token;

    const data = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
            'authorization': `Basic ${Buffer.from(
                [values.client_id, values.client_secret].join(':')
            ).toString('base64')}`,
            'content-type': 'application/x-www-form-urlencoded',
            'user-agent': genericUserAgent,
            'accept': 'application/json'
        },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(values.refresh_token)}`
    }).then(r => r.json()).catch(() => {});
    if (!data) return;

    const { access_token, refresh_token, expires_in } = data;
    if (!access_token) return;

    updateCookieValues(cookie, {
        ...cookie.values(),
        access_token, refresh_token,
        expiry: new Date().getTime() + (expires_in * 1000),
    });

    return access_token;
}

const decodeHTML = value => value
    ?.replaceAll('&amp;', '&')
    .replaceAll('&#x2F;', '/')
    .replaceAll('&#47;', '/');

const parseAttributes = value => Object.fromEntries(
    [...value.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]])
);

const imageExtensions = new Set(['gif', 'jpeg', 'jpg', 'png', 'webp']);
const imageHosts = new Set([
    'i.redd.it',
    'preview.redd.it',
    'external-preview.redd.it',
    'i.reddituploads.com',
]);

const getImageInfo = value => {
    if (!value) return;

    let url;
    try {
        url = new URL(decodeHTML(value));
    } catch {
        return;
    }

    if (url.protocol !== 'https:' || !imageHosts.has(url.hostname)) return;

    const extension = url.pathname.split('.').at(-1)?.toLowerCase();
    if (!imageExtensions.has(extension)) return;

    return { url: url.toString(), extension };
};

const imagePicker = ({ images, sourceId }) => ({
    picker: images.map((image, index) => {
        const filename = `reddit_${sourceId}_${index + 1}.${image.extension}`;
        const url = createStream({
            service: 'reddit',
            type: 'proxy',
            url: image.url,
            filename,
            headers: { 'user-agent': genericUserAgent },
        });

        return { type: 'photo', url, thumb: url };
    }),
});

const imageResult = ({ images, sourceId }) => {
    if (!images?.length) return;
    if (images.length > 1) return imagePicker({ images, sourceId });

    return {
        urls: images[0].url,
        headers: { 'user-agent': genericUserAgent },
        isPhoto: true,
        filename: `reddit_${sourceId}.${images[0].extension}`,
    };
};

const imagesFromJSON = data => {
    const galleryItems = data?.gallery_data?.items;
    const mediaMetadata = data?.media_metadata;

    if (Array.isArray(galleryItems) && mediaMetadata) {
        return galleryItems.map(item => {
            const media = mediaMetadata[item.media_id];
            return getImageInfo(media?.s?.u || media?.s?.gif);
        }).filter(Boolean);
    }

    const direct = getImageInfo(data?.url_overridden_by_dest || data?.url);
    if (direct) return [direct];

    const preview = getImageInfo(data?.preview?.images?.[0]?.source?.url);
    return preview ? [preview] : [];
};

const imagesFromPage = (page, id) => {
    if (!page) return [];

    const postStart = page.indexOf(`id="thing_t3_${id}"`);
    if (postStart < 0) return [];

    const post = page.slice(postStart);
    const mediaIds = post.match(/data-media-ids="([^"]+)"/)?.[1]?.split(',');

    if (mediaIds?.length) {
        return mediaIds.map(mediaId => {
            const escapedId = mediaId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const tile = post.match(new RegExp(
                `data-media-id="${escapedId}"[\\s\\S]{0,500}?preview\\.redd\\.it\\/${escapedId}\\.([a-z0-9]+)`,
                'i'
            ));
            const extension = tile?.[1]?.toLowerCase();
            if (!imageExtensions.has(extension)) return;

            return {
                url: `https://i.redd.it/${mediaId}.${extension}`,
                extension,
            };
        }).filter(Boolean);
    }

    const openingTag = post.slice(0, post.indexOf('>') + 1);
    return [getImageInfo(openingTag.match(/data-url="([^"]+)"/)?.[1])].filter(Boolean);
};

const getPublicPage = async ({ id, dispatcher }) => {
    const url = `https://old.reddit.com/comments/${id}`;
    let page = await fetch(url, {
        headers: { 'user-agent': genericUserAgent },
        dispatcher,
        signal: AbortSignal.timeout(15000),
    }).then(response => response.ok ? response.text() : undefined)
      .catch(() => {});

    if (page) return page;

    // Reddit sometimes rejects Node's TLS fingerprint while serving the same
    // public page normally to a browser-like wget request.
    try {
        const { stdout } = await execFileAsync(
            'busybox',
            [
                'wget', '-qO-',
                '--header', `User-Agent: ${genericUserAgent}`,
                url,
            ],
            {
                encoding: 'utf8',
                maxBuffer: 5 * 1024 * 1024,
                timeout: 30000,
            }
        );
        page = stdout;
    } catch {}

    return page;
};

const getPublicDash = async ({ page, quality, dispatcher }) => {
    if (!page) return;

    const mpdURL = decodeHTML(page?.match(/data-mpd-url="([^"]+)"/)?.[1]);
    if (!mpdURL) return;

    const manifest = await fetch(mpdURL, {
        headers: { 'user-agent': genericUserAgent },
        dispatcher,
        signal: AbortSignal.timeout(15000),
    }).then(response => response.ok ? response.text() : undefined)
      .catch(() => {});
    if (!manifest) return;

    const duration = manifest.match(/mediaPresentationDuration="PT([\d.]+)S"/)?.[1];
    if (duration && Number(duration) > env.durationLimit) {
        return { error: "content.too_long" };
    }

    const adaptationSets = [...manifest.matchAll(
        /<AdaptationSet\b([^>]*)>([\s\S]*?)<\/AdaptationSet>/g
    )];
    const videoSet = adaptationSets.find(set =>
        parseAttributes(set[1]).contentType === 'video'
    )?.[2];
    const audioSet = adaptationSets.find(set =>
        parseAttributes(set[1]).contentType === 'audio'
    )?.[2];

    const videoOptions = [...(videoSet || '').matchAll(
        /<Representation\b([^>]*)>([\s\S]*?)<\/Representation>/g
    )].map(match => ({
        ...parseAttributes(match[1]),
        path: match[2].match(/<BaseURL>([^<]+)<\/BaseURL>/)?.[1],
    })).filter(option => option.path && option.height);

    if (!videoOptions.length) return;

    const requestedQuality = quality === 'max' ? Infinity : Number(quality || 1080);
    const sortedVideos = videoOptions.sort((a, b) => Number(b.height) - Number(a.height));
    const selectedVideo = sortedVideos.find(video => Number(video.height) <= requestedQuality)
                       || sortedVideos.at(-1);
    const audioPath = audioSet?.match(/<BaseURL>([^<]+)<\/BaseURL>/)?.[1];
    const videoURL = new URL(selectedVideo.path, mpdURL).toString();
    const audioURL = audioPath && new URL(audioPath, mpdURL).toString();

    return {
        typeId: audioURL ? 'tunnel' : 'redirect',
        type: audioURL ? 'merge' : 'proxy',
        urls: audioURL ? [videoURL, audioURL] : videoURL,
        resolution: selectedVideo.height,
    };
}

export default async function(obj) {
    let params = obj;
    const accessToken = await getAccessToken();
    const headers = {
        'user-agent': genericUserAgent,
        ...(accessToken && { authorization: `Bearer ${accessToken}` }),
        accept: 'application/json'
    };

    if (params.shortId) {
        params = await resolveRedirectingURL(
            `https://www.reddit.com/video/${params.shortId}`,
            obj.dispatcher, headers
        );
    }

    if (!params.id && params.shareId) {
        params = await resolveRedirectingURL(
            `https://www.reddit.com/r/${params.sub}/s/${params.shareId}`,
            obj.dispatcher, headers
        );
    }

    if (!params?.id) return { error: "fetch.short_link" };

    const url = new URL(`https://www.reddit.com/comments/${params.id}.json`);
    url.searchParams.set('raw_json', '1');

    if (accessToken) url.hostname = 'oauth.reddit.com';

    let data = await fetch(
        url, {
            headers,
            dispatcher: obj.dispatcher,
            signal: AbortSignal.timeout(15000),
        }
    ).then(r => r.json()).catch(() => {});

    let sourceId = params.id;
    if (params.sub || params.user) {
        sourceId = `${String(params.sub || params.user).toLowerCase()}_${params.id}`;
    }

    if (!data || !Array.isArray(data)) {
        const page = await getPublicPage({
            id: params.id,
            dispatcher: obj.dispatcher,
        });
        const publicImages = imageResult({
            images: imagesFromPage(page, params.id),
            sourceId,
        });
        if (publicImages) return publicImages;

        const publicDash = await getPublicDash({
            page,
            quality: obj.quality,
            dispatcher: obj.dispatcher,
        });

        if (publicDash?.error) return publicDash;
        if (!publicDash) return { error: "fetch.fail" };

        return {
            ...publicDash,
            audioFilename: `reddit_${sourceId}_audio`,
            filename: `reddit_${sourceId}_${publicDash.resolution}p.mp4`,
        };
    }

    data = data[0]?.data?.children[0]?.data;

    const directImages = imagesFromJSON(data);
    const jsonImages = imageResult({
        images: [
            ...directImages,
            ...(!directImages.length
                ? imagesFromJSON(data?.crosspost_parent_list?.[0])
                : []),
        ],
        sourceId,
    });
    if (jsonImages) return jsonImages;

    if (!data?.secure_media?.reddit_video) {
        const page = await getPublicPage({
            id: params.id,
            dispatcher: obj.dispatcher,
        });
        const publicImages = imageResult({
            images: imagesFromPage(page, params.id),
            sourceId,
        });
        return publicImages || { error: "fetch.empty" };
    }

    if (data.secure_media?.reddit_video?.duration > env.durationLimit)
        return { error: "content.too_long" };

    const video = data.secure_media?.reddit_video?.fallback_url?.split('?')[0];

    let audio = false,
        audioFileLink = `${data.secure_media?.reddit_video?.fallback_url?.split('DASH')[0]}audio`;

    if (video.match('.mp4')) {
        audioFileLink = `${video.split('_')[0]}_audio.mp4`
    }

    // test the existence of audio
    await fetch(audioFileLink, { method: "HEAD" }).then(r => {
        if (Number(r.status) === 200) {
            audio = true
        }
    }).catch(() => {})

    // fallback for videos with variable audio quality
    if (!audio) {
        audioFileLink = `${video.split('_')[0]}_AUDIO_128.mp4`
        await fetch(audioFileLink, { method: "HEAD" }).then(r => {
            if (Number(r.status) === 200) {
                audio = true
            }
        }).catch(() => {})
    }

    if (!audio) return {
        typeId: "redirect",
        urls: video
    }

    return {
        typeId: "tunnel",
        type: "merge",
        urls: [video, audioFileLink],
        audioFilename: `reddit_${sourceId}_audio`,
        filename: `reddit_${sourceId}.mp4`
    }
}
