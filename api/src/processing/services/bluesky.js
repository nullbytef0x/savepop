import HLS from "hls-parser";
import { cobaltUserAgent } from "../../config.js";
import { createStream } from "../../stream/manage.js";

const fetchWithRetry = async (url, options = {}, as = "json") => {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const response = await fetch(url, {
                ...options,
                signal: AbortSignal.timeout(10000),
            });
            if (!response.ok) continue;
            return as === "text" ? await response.text() : await response.json();
        } catch {}
    }
}

const getOriginalBlobURL = async ({ did, cid, dispatcher }) => {
    if (!did?.startsWith("did:plc:") || !cid) return;

    const document = await fetchWithRetry(
        `https://plc.directory/${encodeURIComponent(did)}`,
        { dispatcher }
    );
    const endpoint = document?.service?.find(
        service => service.id === "#atproto_pds"
    )?.serviceEndpoint;
    if (!endpoint) return;

    let pds;
    try {
        pds = new URL(endpoint);
    } catch {
        return;
    }
    if (pds.protocol !== "https:") return;

    const blobURL = new URL("/xrpc/com.atproto.sync.getBlob", pds);
    blobURL.searchParams.set("did", did);
    blobURL.searchParams.set("cid", cid);
    return blobURL.toString();
};

const extractVideo = async ({ media, filename, dispatcher, did }) => {
    const originalBlob = await getOriginalBlobURL({
        did,
        cid: media?.cid,
        dispatcher,
    });
    if (originalBlob) {
        return {
            urls: originalBlob,
            filename: `${filename}.mp4`,
            audioFilename: `${filename}_audio`,
        };
    }

    let urlMasterHLS = media?.playlist;

    if (!urlMasterHLS || !urlMasterHLS.startsWith("https://video.bsky.app/")) {
        return { error: "fetch.empty" };
    }

    urlMasterHLS = urlMasterHLS.replace(
        "video.bsky.app/watch/",
        "video.cdn.bsky.app/hls/"
    );

    const masterHLS = await fetchWithRetry(
        urlMasterHLS,
        { dispatcher },
        "text"
    );

    if (!masterHLS) return { error: "fetch.empty" };

    const video = HLS.parse(masterHLS)
            ?.variants
            ?.reduce((a, b) => a?.bandwidth > b?.bandwidth ? a : b);

    if (!video?.uri) return { error: "fetch.empty" };
    const videoURL = new URL(video.uri, urlMasterHLS).toString();

    return {
        urls: videoURL,
        filename: `${filename}.mp4`,
        audioFilename: `${filename}_audio`,
        isHLS: true,
    }
}

const extractImages = ({ getPost, filename, alwaysProxy }) => {
    const images = getPost?.thread?.post?.embed?.images;

    if (!images || images.length === 0) {
        return { error: "fetch.empty" };
    }

    if (images.length === 1) return {
        urls: images[0].fullsize,
        isPhoto: true,
        filename: `${filename}.jpg`,
    }

    const picker = images.map((image, i) => {
        let url = image.fullsize;
        let proxiedImage = createStream({
            service: "bluesky",
            type: "proxy",
            url,
            filename: `${filename}_${i + 1}.jpg`,
        });

        if (alwaysProxy) url = proxiedImage;

        return {
            type: "photo",
            url,
            thumb: proxiedImage,
        }
    });

    return { picker };
}

const extractGif = ({ url, filename }) => {
    const gifUrl = new URL(url);

    if (!gifUrl || gifUrl.hostname !== "media.tenor.com") {
        return { error: "fetch.empty" };
    }

    // remove downscaling params from gif url
    // such as "?hh=498&ww=498"
    gifUrl.search = "";

    return {
        urls: gifUrl,
        isPhoto: true,
        filename: `${filename}.gif`,
    }
}

export default async function ({ user, post, alwaysProxy, dispatcher }) {
    const apiEndpoint = new URL("https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?depth=0&parentHeight=0");
    apiEndpoint.searchParams.set(
        "uri",
        `at://${user}/app.bsky.feed.post/${post}`
    );

    const getPost = await fetchWithRetry(apiEndpoint, {
        headers: {
            "user-agent": cobaltUserAgent,
        },
        dispatcher
    });

    if (!getPost) return { error: "fetch.empty" };

    if (getPost.error) {
        switch (getPost.error) {
            case "NotFound":
            case "InternalServerError":
                return { error: "content.post.unavailable" };
            case "InvalidRequest":
                return { error: "link.unsupported" };
            default:
                return { error: "content.post.unavailable" };
        }
    }

    const embedType = getPost?.thread?.post?.embed?.$type;
    const filename = `bluesky_${user}_${post}`;

    switch (embedType) {
        case "app.bsky.embed.video#view":
            return extractVideo({
                media: getPost.thread?.post?.embed,
                filename,
                dispatcher,
                did: user,
            });

        case "app.bsky.embed.images#view":
            return extractImages({
                getPost,
                filename,
                alwaysProxy
            });

        case "app.bsky.embed.external#view":
            return extractGif({
                url: getPost?.thread?.post?.embed?.external?.uri,
                filename,
            });

        case "app.bsky.embed.recordWithMedia#view":
            if (getPost?.thread?.post?.embed?.media?.$type === "app.bsky.embed.external#view") {
                return extractGif({
                    url: getPost?.thread?.post?.embed?.media?.external?.uri,
                    filename,
                });
            }
            return extractVideo({
                media: getPost.thread?.post?.embed?.media,
                filename,
                dispatcher,
                did: user,
            });
    }

    return { error: "fetch.empty" };
}
