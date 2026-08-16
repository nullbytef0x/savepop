import { genericUserAgent } from "../../config.js";

const headers = {
    'User-Agent': genericUserAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
}

const decodeHtml = (value) => value
    .replaceAll('&amp;', '&')
    .replaceAll('&#38;', '&')
    .replaceAll('&#x26;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");

const addMediaUrl = (urls, value) => {
    if (!value) return;

    try {
        const url = new URL(decodeHtml(value));
        if (!['http:', 'https:'].includes(url.protocol)) return;
        if (!urls.includes(url.toString())) urls.push(url.toString());
    } catch {}
}

export const extractMediaUrls = (html) => {
    const urls = [];

    // Facebook has used all of these fields for public video pages. Keep HD
    // fields first so the best available source wins after de-duplication.
    const mediaFields = [
        'browser_native_hd_url',
        'playable_url_quality_hd',
        'browser_native_sd_url',
        'playable_url',
        'video_url',
    ];

    for (const field of mediaFields) {
        const pattern = new RegExp(
            `"${field}"\\s*:\\s*("(?:\\\\.|[^"\\\\])*")`,
            'g'
        );

        for (const match of html.matchAll(pattern)) {
            try {
                addMediaUrl(urls, JSON.parse(match[1]));
            } catch {}
        }
    }

    // Public pages sometimes expose only Open Graph media metadata.
    for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
        const property = tag[0].match(
            /(?:property|name)=["'](og:video(?::url|:secure_url)?)["']/i
        );
        const content = tag[0].match(/content=["']([^"']+)["']/i);

        if (property && content) addMediaUrl(urls, content[1]);
    }

    return urls;
}

const addCandidate = (candidates, value) => {
    if (!value) return;

    try {
        const url = new URL(value);
        if (!candidates.includes(url.toString())) {
            candidates.push(url.toString());
        }
    } catch {}
}

const addFacebookVariants = (candidates, value) => {
    addCandidate(candidates, value);

    try {
        const url = new URL(value);
        if (!['facebook.com', 'www.facebook.com', 'web.facebook.com'].includes(url.hostname)) {
            return;
        }

        for (const hostname of ['www.facebook.com', 'web.facebook.com', 'm.facebook.com']) {
            url.hostname = hostname;
            addCandidate(candidates, url);
        }
    } catch {}
}

const resolveShortUrl = async (url, dispatcher) => {
    try {
        const response = await fetch(url, {
            headers,
            dispatcher,
            redirect: 'follow',
            signal: AbortSignal.timeout(10000),
        });

        if (response.url && response.url !== url) return response.url;

        const link = response.headers.get('link')?.match(/<([^>]+)>/)?.[1];
        return link || undefined;
    } catch {}
}

export default async function({ id, shareType, shortLink, url, dispatcher }) {
    const candidates = [];

    if (shortLink) {
        const shortUrl = `https://fb.watch/${shortLink}/`;
        addCandidate(candidates, shortUrl);

        const resolved = await resolveShortUrl(shortUrl, dispatcher);
        if (resolved) addFacebookVariants(candidates, resolved);
    } else if (url) {
        // For fb.watch links, normalization creates an internal placeholder;
        // the actual short URL and its resolved destination are better inputs.
        addFacebookVariants(candidates, url);
    }

    if (shareType) {
        addFacebookVariants(
            candidates,
            `https://www.facebook.com/share/${shareType}/${id}`
        );
    } else if (id) {
        addFacebookVariants(candidates, `https://www.facebook.com/reel/${id}`);
        addFacebookVariants(candidates, `https://www.facebook.com/watch/?v=${id}`);
    }

    let receivedPage = false;

    for (const candidate of candidates) {
        try {
            const response = await fetch(candidate, {
                headers,
                dispatcher,
                redirect: 'follow',
                signal: AbortSignal.timeout(10000),
            });

            if (!response.ok) continue;

            const html = await response.text();
            if (!html) continue;
            receivedPage = true;

            const urls = extractMediaUrls(html);
            if (!urls.length) continue;

            const baseFilename = `facebook_${id || shortLink}`;

            return {
                urls: urls[0],
                filename: `${baseFilename}.mp4`,
                audioFilename: `${baseFilename}_audio`,
            };
        } catch {}
    }

    return { error: receivedPage ? "fetch.empty" : "fetch.fail" };
}
