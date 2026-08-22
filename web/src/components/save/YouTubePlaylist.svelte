<script lang="ts">
    import { get } from "svelte/store";
    import { strToU8, zip } from "fflate";

    import API from "$lib/api/api";
    import settings from "$lib/state/settings";
    import { link } from "$lib/state/omnibox";
    import { t } from "$lib/i18n/translations";
    import { downloadFile } from "$lib/download";
    import { isYouTubePlaylistURL } from "$lib/youtube-playlist";
    import {
        namedSubtitleLanguages,
        namedYoutubeDubLanguages,
        subtitleLanguages,
        youtubeDubLanguages,
    } from "$lib/settings/audio-sub-language";
    import { audioBitrateOptions, videoQualityOptions } from "$lib/types/settings/v2";

    import type {
        CobaltSaveRequestBody,
        YouTubePlaylistEntry,
        YouTubePlaylistResponse,
    } from "$lib/types/api";

    type EntryStatus = "waiting" | "preparing" | "downloading" | "done" | "error";
    type SubtitleMode = "none" | "embed" | "separate";
    type PlaylistFormat = `mp4:${string}` | `mp3:${string}`;

    let playlist = $state<YouTubePlaylistResponse["playlist"]>();
    let loading = $state(false);
    let downloading = $state(false);
    let errorMessage = $state("");
    let filter = $state("");
    let selectedIds = $state<string[]>([]);
    let statuses = $state<Record<string, EntryStatus>>({});
    let progress = $state<Record<string, number>>({});

    const saved = get(settings).save;
    let outputFormat = $state<PlaylistFormat>(`mp4:${saved.videoQuality}`);
    let audioLanguage = $state(saved.youtubeDubLang);
    let subtitleMode = $state<SubtitleMode>("none");
    let subtitleLanguage = $state(
        saved.subtitleLang === "none" ? "en" : saved.subtitleLang,
    );

    let requestVersion = 0;

    let visible = $derived(isYouTubePlaylistURL($link));
    let filteredEntries = $derived(
        playlist?.entries.filter(entry =>
            entry.title.toLowerCase().includes(filter.trim().toLowerCase())
        ) || [],
    );
    let allFilteredSelected = $derived(
        filteredEntries.length > 0
        && filteredEntries.every(entry => selectedIds.includes(entry.id)),
    );
    let someFilteredSelected = $derived(
        filteredEntries.some(entry => selectedIds.includes(entry.id)),
    );
    let audioLanguageNames = $derived(namedYoutubeDubLanguages($t));
    let subtitleLanguageNames = $derived(namedSubtitleLanguages($t));
    let isAudioOnly = $derived(outputFormat.startsWith("mp3:"));

    const formatDuration = (value?: number) => {
        if (!Number.isFinite(value)) return "--:--";
        const seconds = Math.max(0, Math.round(value!));
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainder = seconds % 60;

        return hours
            ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
            : `${minutes}:${String(remainder).padStart(2, "0")}`;
    };

    const safeFilename = (value: string) => value
        .replace(/[\\/:*?"<>|\u0000-\u001F]/g, "-")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160) || "youtube-playlist";

    const statusText = (entry: YouTubePlaylistEntry) => {
        const status = statuses[entry.id];
        if (!status) return "";
        if (status === "downloading" && progress[entry.id]) {
            return `${$t(`save.playlist.status.${status}`)} ${progress[entry.id]}%`;
        }
        return $t(`save.playlist.status.${status}`);
    };

    const loadPlaylist = async (url: string) => {
        const version = ++requestVersion;
        loading = true;
        playlist = undefined;
        selectedIds = [];
        statuses = {};
        progress = {};
        errorMessage = "";

        const response = await API.requestPlaylist(url);
        if (version !== requestVersion) return;

        loading = false;
        if (response.status === "error") {
            errorMessage = $t(response.error.code, response.error.context);
            return;
        }

        playlist = response.playlist;
        selectedIds = response.playlist.entries.map(entry => entry.id);
    };

    $effect(() => {
        const url = $link;
        if (!isYouTubePlaylistURL(url)) {
            requestVersion++;
            loading = false;
            playlist = undefined;
            errorMessage = "";
            return;
        }

        const timer = setTimeout(() => loadPlaylist(url), 350);
        return () => clearTimeout(timer);
    });

    const toggleEntry = (id: string) => {
        selectedIds = selectedIds.includes(id)
            ? selectedIds.filter(selected => selected !== id)
            : [...selectedIds, id];
    };

    const toggleFiltered = () => {
        const visibleIds = filteredEntries.map(entry => entry.id);
        if (allFilteredSelected) {
            selectedIds = selectedIds.filter(id => !visibleIds.includes(id));
        } else {
            selectedIds = [...new Set([...selectedIds, ...visibleIds])];
        }
    };

    const vttToSrt = (value: string) => {
        const blocks = value
            .replace(/^\uFEFF/, "")
            .replace(/\r/g, "")
            .split(/\n{2,}/)
            .map(block => block.trim())
            .filter(block => block && !/^(WEBVTT|NOTE|STYLE|REGION)\b/.test(block));

        let index = 0;
        return blocks.map(block => {
            const lines = block.split("\n");
            const timingIndex = lines.findIndex(line => line.includes("-->"));
            if (timingIndex < 0) return "";

            const timing = lines[timingIndex]
                .replace(/(\d{2}:\d{2}:\d{2}|\d{2}:\d{2})\.(\d{3})/g, "$1,$2")
                .replace(/( --> \S+?)(?:\s+.*)?$/, "$1");
            const text = lines.slice(timingIndex + 1).join("\n").trim();
            if (!text) return "";

            index++;
            return `${index}\n${timing}\n${text}`;
        }).filter(Boolean).join("\n\n") + "\n";
    };

    const readResponse = async (
        url: string,
        entryId: string,
    ) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`download failed with HTTP ${response.status}`);

        const total = Number(
            response.headers.get("content-length")
            || response.headers.get("estimated-content-length")
        ) || 0;
        if (!response.body) {
            const bytes = new Uint8Array(await response.arrayBuffer());
            if (!bytes.byteLength) throw new Error($t("save.playlist.error.empty_file"));
            return bytes;
        }

        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            received += value.length;
            chunks.push(value);
            if (total) {
                progress = {
                    ...progress,
                    [entryId]: Math.min(99, Math.round(received / total * 100)),
                };
            }
        }

        if (!received) throw new Error($t("save.playlist.error.empty_file"));

        const bytes = new Uint8Array(received);
        let offset = 0;
        for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.length;
        }
        return bytes;
    };

    const createZip = (files: Record<string, Uint8Array>) => {
        return new Promise<Uint8Array>((resolve, reject) => {
            zip(files, { level: 0 }, (error, bytes) => {
                if (error) reject(error);
                else if (!bytes.byteLength) reject(new Error($t("save.playlist.error.empty_zip")));
                else resolve(bytes);
            });
        });
    };

    const downloadSelected = async () => {
        if (!playlist || !selectedIds.length || downloading) return;

        downloading = true;
        errorMessage = "";
        const activePlaylist = playlist;
        const entries = activePlaylist.entries.filter(entry => selectedIds.includes(entry.id));
        statuses = Object.fromEntries(entries.map(entry => [entry.id, "waiting"]));
        progress = {};
        const files: Record<string, Uint8Array> = {};
        const [format, formatValue] = outputFormat.split(":");
        const audioOnly = format === "mp3";
        const failedItems: string[] = [];

        try {
            for (const [position, entry] of entries.entries()) {
                const request: CobaltSaveRequestBody = {
                    url: entry.url,
                    downloadMode: audioOnly ? "audio" : "auto",
                    audioFormat: audioOnly ? "mp3" : undefined,
                    audioBitrate: audioOnly
                        ? formatValue as typeof saved.audioBitrate
                        : undefined,
                    videoQuality: audioOnly
                        ? undefined
                        : formatValue as typeof saved.videoQuality,
                    youtubeVideoCodec: "h264",
                    youtubeVideoContainer: "mp4",
                    youtubeDubLang: audioLanguage === "original" ? undefined : audioLanguage,
                    subtitleMode: audioOnly ? "none" : subtitleMode,
                    subtitleLang: audioOnly || subtitleMode === "none"
                        ? undefined
                        : subtitleLanguage,
                    filenameStyle: saved.filenameStyle,
                    disableMetadata: saved.disableMetadata,
                    localProcessing: "disabled",
                    alwaysProxy: true,
                };

                const prefix = String(position + 1).padStart(String(entries.length).length, "0");
                let completedResponse;
                let mediaBytes: Uint8Array | undefined;
                let itemError = $t("save.playlist.error.download");

                // YouTube media URLs are short-lived and a processing tunnel
                // can occasionally close before yielding bytes. Re-running
                // the API request creates fresh signed URLs for each retry.
                for (let attempt = 0; attempt < 3; attempt++) {
                    statuses = { ...statuses, [entry.id]: "preparing" };
                    progress = { ...progress, [entry.id]: 0 };

                    try {
                        const response = await API.request(request);
                        if (!response || response.status === "error") {
                            itemError = response?.status === "error"
                                ? $t(response.error.code, response.error.context)
                                : $t("error.api.unreachable");
                            throw new Error(itemError);
                        }
                        if (response.status !== "tunnel" && response.status !== "redirect") {
                            itemError = $t("save.playlist.error.unsupported_response");
                            throw new Error(itemError);
                        }

                        statuses = { ...statuses, [entry.id]: "downloading" };
                        mediaBytes = await readResponse(response.url, entry.id);
                        completedResponse = response;
                        break;
                    } catch (error) {
                        itemError = error instanceof Error ? error.message : itemError;
                        if (attempt < 2) {
                            await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
                        }
                    }
                }

                if (!completedResponse || !mediaBytes) {
                    failedItems.push(`${entry.title}: ${itemError}`);
                    statuses = { ...statuses, [entry.id]: "error" };
                    continue;
                }

                const mediaName = `${prefix} - ${safeFilename(completedResponse.filename)}`;
                files[mediaName] = mediaBytes;

                let subtitleFile: { name: string, bytes: Uint8Array } | undefined;
                if (completedResponse.status === "tunnel" && completedResponse.subtitle) {
                    const subtitleResponse = await fetch(completedResponse.subtitle.url);
                    if (!subtitleResponse.ok) {
                        throw new Error(`subtitle download failed with HTTP ${subtitleResponse.status}`);
                    }
                    const subtitleName = `${prefix} - ${safeFilename(completedResponse.subtitle.filename)}`
                        .replace(/\.vtt$/i, ".srt");
                    subtitleFile = {
                        name: subtitleName,
                        bytes: strToU8(vttToSrt(await subtitleResponse.text())),
                    };
                }

                if (subtitleFile) files[subtitleFile.name] = subtitleFile.bytes;

                progress = { ...progress, [entry.id]: 100 };
                statuses = { ...statuses, [entry.id]: "done" };
            }

            if (!Object.keys(files).length) {
                throw new Error(failedItems[0] || $t("save.playlist.error.download"));
            }

            const archive = await createZip(files);
            const archiveBuffer = archive.slice().buffer as ArrayBuffer;
            const file = new File(
                [archiveBuffer],
                `${safeFilename(activePlaylist.title)}${audioOnly ? " - MP3" : ""}.zip`,
                { type: "application/zip" },
            );
            downloadFile({ file });

            if (failedItems.length) {
                errorMessage = $t("save.playlist.error.partial", {
                    value: String(failedItems.length),
                });
            }
        } catch (error) {
            const active = entries.find(entry =>
                ["preparing", "downloading"].includes(statuses[entry.id])
            );
            if (active) statuses = { ...statuses, [active.id]: "error" };
            errorMessage = error instanceof Error
                ? error.message
                : $t("save.playlist.error.download");
        } finally {
            downloading = false;
        }
    };
</script>

{#if visible}
    <section id="youtube-playlist" aria-live="polite">
        {#if loading}
            <div class="playlist-message">
                <span class="spinner" aria-hidden="true"></span>
                <strong>{$t("save.playlist.loading")}</strong>
                <span>{$t("save.playlist.loading_hint")}</span>
            </div>
        {:else if errorMessage && !playlist}
            <div class="playlist-message error-message">
                <strong>{$t("save.playlist.error.title")}</strong>
                <span>{errorMessage}</span>
                <button onclick={() => loadPlaylist($link)}>{$t("save.playlist.retry")}</button>
            </div>
        {:else if playlist}
            <header class="playlist-header">
                {#if playlist.thumbnail}
                    <img src={playlist.thumbnail} alt="" />
                {/if}
                <div>
                    <span class="playlist-kicker">{$t("save.playlist.youtube_playlist")}</span>
                    <h2>{playlist.title}</h2>
                    <p>{playlist.uploader} · {playlist.entries.length} {$t("save.playlist.videos")}</p>
                </div>
            </header>

            <div class="playlist-controls">
                <label>
                    <span>{$t("save.playlist.format")}</span>
                    <select bind:value={outputFormat} disabled={downloading}>
                        <optgroup label={$t("save.playlist.format.video")}>
                            {#each videoQualityOptions as option}
                                <option value={`mp4:${option}`}>
                                    {option === "max" ? $t("save.playlist.maximum") : `MP4 ${option}p`}
                                </option>
                            {/each}
                        </optgroup>
                        <optgroup label={$t("save.playlist.format.audio")}>
                            {#each audioBitrateOptions.filter(option => option !== "8") as option}
                                <option value={`mp3:${option}`}>MP3 {option} kbps</option>
                            {/each}
                        </optgroup>
                    </select>
                </label>

                <label>
                    <span>{$t("save.playlist.audio_track")}</span>
                    <select bind:value={audioLanguage} disabled={downloading}>
                        {#each youtubeDubLanguages as language}
                            <option value={language}>{audioLanguageNames[language]}</option>
                        {/each}
                    </select>
                </label>

                {#if !isAudioOnly}
                    <label>
                        <span>{$t("save.playlist.subtitles")}</span>
                        <select bind:value={subtitleMode} disabled={downloading}>
                            <option value="none">{$t("save.playlist.subtitles.none")}</option>
                            <option value="embed">{$t("save.playlist.subtitles.embed")}</option>
                            <option value="separate">{$t("save.playlist.subtitles.separate")}</option>
                        </select>
                    </label>

                    {#if subtitleMode !== "none"}
                        <label>
                            <span>{$t("save.playlist.subtitle_language")}</span>
                            <select bind:value={subtitleLanguage} disabled={downloading}>
                                {#each subtitleLanguages.filter(language => language !== "none") as language}
                                    <option value={language}>{subtitleLanguageNames[language]}</option>
                                {/each}
                            </select>
                        </label>
                    {/if}
                {/if}
            </div>

            <div class="selection-bar">
                <div class="selection-tools">
                    <label class="select-all">
                        <input
                            type="checkbox"
                            checked={allFilteredSelected}
                            indeterminate={someFilteredSelected && !allFilteredSelected}
                            onchange={toggleFiltered}
                            disabled={downloading || !filteredEntries.length}
                        />
                        <span>{$t("save.playlist.select_all")}</span>
                    </label>
                    <div class="filter-box">
                        <span aria-hidden="true">⌕</span>
                        <input
                            bind:value={filter}
                            placeholder={$t("save.playlist.filter")}
                            aria-label={$t("save.playlist.filter")}
                            disabled={downloading}
                        />
                    </div>
                </div>
                <div class="selection-action">
                    <span class="selected-count">
                        {$t("save.playlist.selected", { value: String(selectedIds.length) })}
                    </span>
                    <button
                        class="zip-button"
                        onclick={downloadSelected}
                        disabled={downloading || selectedIds.length === 0}
                    >
                        <span aria-hidden="true">{downloading ? "…" : "↓"}</span>
                        {downloading
                            ? $t("save.playlist.downloading")
                            : $t(
                                isAudioOnly
                                    ? "save.playlist.download_audio_zip"
                                    : "save.playlist.download_zip",
                                { value: String(selectedIds.length) },
                            )}
                    </button>
                </div>
            </div>

            <div class="playlist-grid">
                {#each filteredEntries as entry (entry.id)}
                    <label
                        class="video-card"
                        class:selected={selectedIds.includes(entry.id)}
                        class:processing={["preparing", "downloading"].includes(statuses[entry.id])}
                        class:complete={statuses[entry.id] === "done"}
                        class:failed={statuses[entry.id] === "error"}
                    >
                        <span class="thumbnail">
                            {#if entry.thumbnail}
                                <img src={entry.thumbnail} alt="" loading="lazy" />
                            {/if}
                            <span class="duration">{formatDuration(entry.duration)}</span>
                            {#if statuses[entry.id]}
                                <span
                                    class="thumbnail-progress"
                                    class:waiting={statuses[entry.id] === "waiting"}
                                    class:preparing={statuses[entry.id] === "preparing"}
                                    class:downloading={statuses[entry.id] === "downloading"}
                                    class:done={statuses[entry.id] === "done"}
                                    class:error={statuses[entry.id] === "error"}
                                    class:indeterminate={statuses[entry.id] === "downloading" && !progress[entry.id]}
                                    style={`--card-progress: ${progress[entry.id] || 0}%`}
                                >
                                    <strong>
                                        {statuses[entry.id] === "done"
                                            ? "✓ 100%"
                                            : statuses[entry.id] === "error"
                                                ? "!"
                                                : progress[entry.id]
                                                    ? `${progress[entry.id]}%`
                                                    : $t(`save.playlist.status.${statuses[entry.id]}`)}
                                    </strong>
                                </span>
                            {/if}
                        </span>
                        <span class="video-copy">
                            <strong title={entry.title}>{entry.title}</strong>
                            {#if statuses[entry.id]}
                                <small>{statusText(entry)}</small>
                            {:else}
                                <small># {entry.index}</small>
                            {/if}
                        </span>
                        <input
                            type="checkbox"
                            checked={selectedIds.includes(entry.id)}
                            onchange={() => toggleEntry(entry.id)}
                            disabled={downloading}
                            aria-label={$t("save.playlist.select_video", { value: entry.title })}
                        />
                    </label>
                {/each}
            </div>

            {#if playlist.truncated}
                <p class="playlist-notice">{$t("save.playlist.truncated")}</p>
            {/if}
            {#if errorMessage}
                <p class="download-error">{errorMessage}</p>
            {/if}

            <footer class="playlist-footer">
                <p>{isAudioOnly ? $t("save.playlist.zip_hint_audio") : $t("save.playlist.zip_hint")}</p>
            </footer>
        {/if}
    </section>
{/if}

<style>
    #youtube-playlist {
        width: min(1200px, 100%);
        margin: var(--spacing-32) auto 0;
        padding: clamp(18px, 3vw, 30px);
        scroll-margin-top: calc(var(--app-header-height) + 18px);
        color: var(--color-charcoal);
        background: var(--surface-paper-white);
        border: 3px solid var(--color-charcoal);
        border-radius: 24px;
        box-shadow: 0 8px 0 color-mix(in srgb, var(--color-charcoal) 12%, transparent);
    }

    .playlist-message {
        display: flex;
        min-height: 170px;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 8px;
        text-align: center;
    }

    .playlist-message strong { font-size: 20px; }
    .playlist-message span { color: var(--color-pencil-gray); }

    .spinner {
        width: 34px;
        height: 34px;
        margin-bottom: 6px;
        border: 4px solid var(--color-storybook-green);
        border-top-color: var(--color-eager-green);
        border-radius: 50%;
        animation: spin 800ms linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .playlist-header {
        display: flex;
        align-items: center;
        gap: 16px;
        padding-bottom: 20px;
        border-bottom: 2px solid var(--border-subtle);
    }

    .playlist-header img {
        width: 112px;
        aspect-ratio: 16 / 9;
        object-fit: cover;
        border: 2px solid var(--color-charcoal);
        border-radius: 12px;
    }

    .playlist-kicker {
        color: var(--color-eager-green);
        font-size: 12px;
        font-weight: 900;
        letter-spacing: .08em;
        text-transform: uppercase;
    }

    h2 {
        margin: 2px 0 3px;
        font-size: clamp(22px, 3vw, 30px);
        line-height: 1.15;
    }

    .playlist-header p,
    .playlist-footer p,
    .playlist-notice {
        margin: 0;
        color: var(--color-pencil-gray);
        font-weight: 700;
    }

    .playlist-controls {
        display: grid;
        grid-template-columns: repeat(4, minmax(150px, 1fr));
        gap: 12px;
        padding: 20px 0;
    }

    .playlist-controls label {
        display: flex;
        min-width: 0;
        flex-direction: column;
        gap: 6px;
        color: var(--color-pencil-gray);
        font-size: 13px;
        font-weight: 800;
    }

    select,
    .filter-box {
        height: 44px;
        color: var(--color-charcoal);
        background: var(--button);
        border: 2px solid var(--button-stroke);
        border-radius: 11px;
        font-size: 14px;
        font-weight: 700;
    }

    select { width: 100%; padding: 0 10px; }

    .selection-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 18px;
        padding: 12px;
        background: color-mix(in srgb, var(--color-storybook-green) 28%, var(--surface-paper-white));
        border: 2px solid color-mix(in srgb, var(--color-charcoal) 18%, transparent);
        border-radius: 15px;
    }

    .selection-tools,
    .selection-action {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .select-all {
        display: flex;
        height: 44px;
        align-items: center;
        gap: 8px;
        padding: 0 14px;
        background: var(--button);
        border: 2px solid var(--button-stroke);
        border-radius: 11px;
        font-size: 14px;
        font-weight: 800;
    }

    input[type="checkbox"] {
        width: 18px;
        height: 18px;
        accent-color: var(--color-eager-green);
        cursor: pointer;
    }

    .filter-box {
        display: flex;
        width: min(320px, 100%);
        align-items: center;
        gap: 7px;
        padding: 0 12px;
    }

    .filter-box span { color: var(--color-pencil-gray); font-size: 22px; }
    .filter-box input {
        width: 100%;
        min-width: 0;
        color: var(--color-charcoal);
        background: transparent;
        border: 0;
        outline: 0;
        font-size: 14px;
        user-select: text;
    }

    .selected-count {
        color: var(--color-pencil-gray);
        font-size: 13px;
        font-weight: 800;
        white-space: nowrap;
    }

    .playlist-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 12px;
        max-height: 570px;
        overflow: auto;
        padding: 2px;
        scrollbar-width: thin;
    }

    .video-card {
        position: relative;
        display: grid;
        min-width: 0;
        grid-template-columns: 104px minmax(0, 1fr) 18px;
        align-items: center;
        gap: 10px;
        padding: 9px;
        background: color-mix(in srgb, var(--button) 80%, var(--surface-paper-white));
        border: 2px solid var(--border-subtle);
        border-radius: 13px;
        cursor: pointer;
        transition: border-color 150ms ease, background 150ms ease, transform 150ms ease;
    }

    .video-card.selected {
        background: color-mix(in srgb, var(--color-storybook-green) 42%, var(--surface-paper-white));
        border-color: var(--color-eager-green);
    }

    .video-card.processing { border-color: var(--color-spark-blue); }
    .video-card.complete { border-color: var(--color-eager-green); }
    .video-card.failed { border-color: var(--red); }

    .thumbnail {
        position: relative;
        display: block;
        overflow: hidden;
        aspect-ratio: 16 / 9;
        background: #000;
        border-radius: 8px;
    }

    .thumbnail img { width: 100%; height: 100%; object-fit: cover; }

    .thumbnail-progress {
        position: absolute;
        inset: 0;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        color: white;
        background: rgba(0, 4, 30, .62);
        box-shadow: inset 0 0 18px rgba(0, 0, 0, .7);
        transition: background 180ms ease, box-shadow 180ms ease;
    }

    .thumbnail-progress::before {
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        height: var(--card-progress);
        background: rgba(88, 204, 2, .68);
        content: "";
        transition: height 240ms ease;
    }

    .thumbnail-progress strong {
        position: relative;
        z-index: 1;
        padding: 3px 6px;
        border-radius: 5px;
        font-size: 11px;
        font-weight: 900;
        text-align: center;
        text-shadow: 0 1px 3px #000;
        text-transform: uppercase;
    }

    .thumbnail-progress.preparing,
    .thumbnail-progress.downloading {
        box-shadow:
            inset 0 0 0 2px var(--color-spark-blue),
            inset 0 0 24px rgba(28, 176, 246, .56);
    }

    .thumbnail-progress.indeterminate::before {
        top: 0;
        height: 100%;
        background: linear-gradient(
            110deg,
            transparent 20%,
            rgba(28, 176, 246, .72) 45%,
            transparent 70%
        );
        transform: translateX(-100%);
        animation: thumbnail-progress-scan 1.15s ease-in-out infinite;
    }

    .thumbnail-progress.done {
        background: rgba(28, 90, 0, .66);
        box-shadow: inset 0 0 0 2px var(--color-eager-green);
    }

    .thumbnail-progress.error {
        background: rgba(160, 0, 20, .72);
        box-shadow: inset 0 0 0 2px var(--red);
    }

    @keyframes thumbnail-progress-scan {
        to { transform: translateX(100%); }
    }

    .duration {
        position: absolute;
        right: 4px;
        bottom: 3px;
        padding: 2px 4px;
        color: white;
        background: rgba(0, 0, 0, .78);
        border-radius: 4px;
        font-size: 10px;
        font-weight: 800;
    }

    .video-copy { min-width: 0; }
    .video-copy strong {
        display: -webkit-box;
        overflow: hidden;
        font-size: 13px;
        line-height: 1.25;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-clamp: 2;
    }
    .video-copy small {
        display: block;
        overflow: hidden;
        margin-top: 5px;
        color: var(--color-pencil-gray);
        font-size: 11px;
        font-weight: 800;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .playlist-notice,
    .download-error {
        margin-top: 14px;
        font-size: 13px;
    }
    .download-error { color: var(--red); font-weight: 800; }

    .playlist-footer {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 20px;
        margin-top: 20px;
        padding-top: 18px;
        border-top: 2px solid var(--border-subtle);
        text-align: center;
    }

    .zip-button,
    .playlist-message button {
        min-height: 50px;
        color: var(--color-paper-white);
        background: var(--color-eager-green);
        border-color: var(--color-charcoal);
        font-weight: 900;
    }
    .zip-button {
        min-width: 210px;
        box-shadow: 0 4px 0 color-mix(in srgb, var(--color-charcoal) 20%, transparent);
    }
    .zip-button span { font-size: 20px; }
    .zip-button:disabled { opacity: .55; cursor: default; }

    @media (hover: hover) {
        .video-card:hover { transform: translateY(-2px); border-color: var(--color-eager-green); }
    }

    @media (max-width: 1100px) {
        .playlist-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .playlist-controls { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (max-width: 900px) {
        .playlist-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }

    @media (max-width: 760px) {
        #youtube-playlist { border-radius: 20px; }
        .playlist-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .selection-bar,
        .selection-action { align-items: stretch; flex-direction: column; }
        .selection-tools { width: 100%; }
        .selection-action { width: 100%; }
        .selected-count { text-align: center; }
        .zip-button { width: 100%; }
    }

    @media (max-width: 650px) {
        .playlist-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (max-width: 520px) {
        .playlist-header img { width: 84px; }
        .playlist-controls,
        .playlist-grid { grid-template-columns: 1fr; }
        .selection-tools { align-items: stretch; flex-direction: column; }
        .filter-box { width: 100%; }
        .video-card { grid-template-columns: 112px minmax(0, 1fr) 18px; }
    }
</style>
