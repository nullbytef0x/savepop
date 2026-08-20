import assert from "node:assert/strict";
import test from "node:test";

import {
    cookieSourceToNetscape,
    mapYtDlpError,
    normalizeQuality,
    selectFormats,
} from "../processing/services/youtube.js";

const direct = {
    protocol: "https",
    has_drm: false,
    url: "https://example.com/media",
};

const info = {
    language: "en",
    formats: [
        { ...direct, format_id: "137", width: 1920, height: 1080, tbr: 4500, vcodec: "avc1.640028", acodec: "none" },
        { ...direct, format_id: "136", width: 1280, height: 720, tbr: 2500, vcodec: "avc1.4d401f", acodec: "none" },
        { ...direct, format_id: "247", width: 1280, height: 720, tbr: 1900, vcodec: "vp9", acodec: "none" },
        { ...direct, format_id: "248", width: 1920, height: 1080, tbr: 3200, vcodec: "vp09.00.40.08", acodec: "none" },
        { ...direct, format_id: "140", abr: 129, vcodec: "none", acodec: "mp4a.40.2", ext: "m4a", language: "en" },
        { ...direct, format_id: "140-es", abr: 128, vcodec: "none", acodec: "mp4a.40.2", ext: "m4a", language: "es" },
        { ...direct, format_id: "251-drc", abr: 150, vcodec: "none", acodec: "opus", ext: "webm", language: "en" },
        { ...direct, format_id: "251", abr: 130, vcodec: "none", acodec: "opus", ext: "webm", language: "en" },
    ],
};

test("selects the requested quality, codec, and dubbed language", () => {
    const selected = selectFormats(info, {
        codec: "h264",
        quality: "720",
        dubLang: "es",
    });

    assert.equal(selected.codec, "h264");
    assert.equal(selected.video.format_id, "136");
    assert.equal(selected.audio.format_id, "140-es");
});

test("falls back from AV1 to VP9 and avoids DRC audio", () => {
    const selected = selectFormats(info, {
        codec: "av1",
        quality: "max",
    });

    assert.equal(selected.codec, "vp9");
    assert.equal(selected.video.format_id, "248");
    assert.equal(selected.audio.format_id, "251");
});

test("preserves selected format IDs while refreshing signed URLs", () => {
    const selected = selectFormats(info, {
        codec: "h264",
        quality: "max",
        formatIds: { video: "136", audio: "140" },
    });

    assert.equal(selected.video.format_id, "136");
    assert.equal(selected.audio.format_id, "140");
});

test("normalizes portrait video quality by its shortest side", () => {
    assert.equal(normalizeQuality({ width: 1080, height: 1920 }), 1080);
});

test("maps common yt-dlp errors to existing API errors", () => {
    assert.equal(
        mapYtDlpError("Sign in to confirm you're not a bot"),
        "youtube.login",
    );
    assert.equal(mapYtDlpError("Private video"), "content.video.private");
    assert.equal(mapYtDlpError("HTTP Error 429"), "fetch.rate");
    assert.equal(mapYtDlpError("Incomplete YouTube ID abc"), "link.unsupported");
});

test("converts Cobalt JSON cookies without exposing them to yt-dlp arguments", () => {
    const result = cookieSourceToNetscape(JSON.stringify({
        youtube: ["SID=test-session; PREF=language=en"],
    }));

    assert.match(result, /^# Netscape HTTP Cookie File/m);
    assert.match(result, /\.youtube\.com\tTRUE\t\/\tTRUE\t0\tSID\ttest-session/);
    assert.match(result, /\.youtube\.com\tTRUE\t\/\tTRUE\t0\tPREF\tlanguage=en/);
});

test("keeps Netscape cookie exports compatible", () => {
    const source = "# Netscape HTTP Cookie File\n.youtube.com\tTRUE\t/\tTRUE\t0\tSID\ttest";
    assert.equal(cookieSourceToNetscape(source), `${source}\n`);
});
