import { getYtDlpJSON } from "./youtube.js";

const youtubeHosts = new Set([
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be",
]);

const playlistLimit = 100;

export const normalizeYouTubePlaylistURL = value => {
    let url;
    try {
        url = new URL(String(value));
    } catch {
        return;
    }

    if (!youtubeHosts.has(url.hostname.toLowerCase())) return;

    const playlistId = url.searchParams.get("list");
    if (!playlistId || !/^[\w-]{10,80}$/.test(playlistId)) return;

    return `https://www.youtube.com/playlist?list=${playlistId}`;
};

const bestThumbnail = entry => entry.thumbnail
    || entry.thumbnails?.findLast?.(thumbnail => thumbnail?.url)?.url
    || (entry.id ? `https://i.ytimg.com/vi/${entry.id}/mqdefault.jpg` : undefined);

export default async function youtubePlaylist(value) {
    const url = normalizeYouTubePlaylistURL(value);
    if (!url) return { error: "link.invalid" };

    const extracted = await getYtDlpJSON(url, [
        "--flat-playlist",
        "--playlist-end", String(playlistLimit + 1),
    ]);
    if (extracted.error) return extracted;

    const info = extracted.info;
    const rawEntries = Array.isArray(info?.entries) ? info.entries : [];
    const entries = rawEntries
        .slice(0, playlistLimit)
        .filter(entry => /^[\w-]{11}$/.test(entry?.id || "")
            && !["private", "premium_only", "subscriber_only", "needs_auth"]
                .includes(entry.availability))
        .map((entry, index) => ({
            id: entry.id,
            title: String(entry.title || `YouTube video ${index + 1}`),
            duration: Number.isFinite(entry.duration) ? entry.duration : undefined,
            thumbnail: bestThumbnail(entry),
            url: `https://www.youtube.com/watch?v=${entry.id}`,
            index: Number(entry.playlist_index) || index + 1,
        }));

    if (!entries.length) return { error: "fetch.fail" };

    return {
        playlist: {
            id: String(info.id || new URL(url).searchParams.get("list")),
            title: String(info.title || "YouTube playlist"),
            uploader: String(info.uploader || info.channel || "YouTube"),
            thumbnail: bestThumbnail(info),
            entries,
            truncated: rawEntries.length > playlistLimit,
        },
    };
}
