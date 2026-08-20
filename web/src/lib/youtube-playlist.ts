const youtubeHosts = new Set([
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be",
]);

export const isYouTubePlaylistURL = (value: string) => {
    try {
        const url = new URL(value);
        return youtubeHosts.has(url.hostname.toLowerCase())
            && Boolean(url.searchParams.get("list"));
    } catch {
        return false;
    }
};

export const revealYouTubePlaylist = () => {
    requestAnimationFrame(() => {
        document.getElementById("youtube-playlist")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    });
};
