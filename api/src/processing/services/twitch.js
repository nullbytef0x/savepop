import { env } from "../../config.js";

const gqlURL = "https://gql.twitch.tv/gql";
const clientIdHead = { "client-id": "kimne78kx3ncx6brgo4mv6wki5h1ko" };

export default async function (obj) {
    const req_metadata = await fetch(gqlURL, {
        method: "POST",
        headers: clientIdHead,
        body: JSON.stringify({
            query: `{
            clip(slug: "${obj.clipId}") {
                broadcaster {
                    login
                }
                createdAt
                curator {
                    login
                }
                durationSeconds
                id
                medium: thumbnailURL(width: 480, height: 272)
                title
                videoQualities {
                    quality
                    sourceURL
                }
            }
        }`
        })
    }).then(r => r.status === 200 ? r.json() : false).catch(() => {});

    if (!req_metadata) return { error: "fetch.fail" };

    const clipMetadata = req_metadata?.data?.clip;
    if (!clipMetadata) return { error: "fetch.empty" };

    if (clipMetadata.durationSeconds > env.durationLimit) {
        return { error: "content.too_long" };
    }
    if (!clipMetadata.videoQualities || !clipMetadata.broadcaster) {
        return { error: "fetch.empty" };
    }

    const req_token = await fetch(gqlURL, {
        method: "POST",
        headers: {
            ...clientIdHead,
            "content-type": "application/json",
        },
        body: JSON.stringify({
            operationName: "VideoAccessToken_Clip",
            variables: { slug: obj.clipId },
            query: `query VideoAccessToken_Clip($slug: ID!) {
                clip(slug: $slug) {
                    playbackAccessToken(params: {
                        platform: "web",
                        playerBackend: "mediaplayer",
                        playerType: "site"
                    }) {
                        signature
                        value
                    }
                }
            }`
        })
    }).then(r => r.status === 200 ? r.json() : false).catch(() => {});

    const accessToken = req_token?.data?.clip?.playbackAccessToken;
    if (!accessToken) return { error: "fetch.fail" };

    const formats = clipMetadata.videoQualities;
    const format = formats.find(f => f.quality === obj.quality) || formats[0];

    return {
        type: "proxy",
        urls: `${format.sourceURL}?${new URLSearchParams({
            sig: accessToken.signature,
            token: accessToken.value
        })}`,
        fileMetadata: {
            title: clipMetadata.title.trim(),
            artist: `Twitch Clip by @${clipMetadata.broadcaster.login}${
                clipMetadata.curator?.login ? `, clipped by @${clipMetadata.curator.login}` : ''
            }`,
        },
        filenameAttributes: {
            service: "twitch",
            id: clipMetadata.id,
            title: clipMetadata.title.trim(),
            author: `${clipMetadata.broadcaster.login}${
                clipMetadata.curator?.login ? `, clipped by ${clipMetadata.curator.login}` : ''
            }`,
            qualityLabel: `${format.quality}p`,
            extension: 'mp4'
        },
        filename: `twitchclip_${clipMetadata.id}_${format.quality}p.mp4`,
        audioFilename: `twitchclip_${clipMetadata.id}_audio`
    }
}
