<script lang="ts">
    import env, { officialApiURL } from "$lib/env";

    import { tick } from "svelte";
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { browser } from "$app/environment";

    import { t } from "$lib/i18n/translations";

    import dialogs from "$lib/state/dialogs";
    import { link } from "$lib/state/omnibox";
    import { hapticSwitch } from "$lib/haptics";
    import { updateSetting } from "$lib/state/settings";
    import { savingHandler } from "$lib/api/saving-handler";
    import { isYouTubePlaylistURL, revealYouTubePlaylist } from "$lib/youtube-playlist";
    import { pasteLinkFromClipboard } from "$lib/clipboard";
    import { turnstileEnabled, turnstileSolved } from "$lib/state/turnstile";

    import type { Optional } from "$lib/types/generic";
    import type { DownloadModeOption } from "$lib/types/settings";

    import ClearButton from "$components/save/buttons/ClearButton.svelte";
    import DownloadButton from "$components/save/buttons/DownloadButton.svelte";

    import Switcher from "$components/buttons/Switcher.svelte";
    import OmniboxIcon from "$components/save/OmniboxIcon.svelte";
    import ActionButton from "$components/buttons/ActionButton.svelte";
    import CaptchaTooltip from "$components/save/CaptchaTooltip.svelte";
    import SettingsButton from "$components/buttons/SettingsButton.svelte";

    import IconMute from "$components/icons/Mute.svelte";
    import IconMusic from "$components/icons/Music.svelte";
    import IconSparkles from "$components/icons/Sparkles.svelte";
    import IconClipboard from "$components/icons/Clipboard.svelte";

    let linkInput: Optional<HTMLInputElement>;

    const validLink = (url: string) => {
        try {
            return /^https?\:/i.test(new URL(url).protocol);
        } catch {}
    };

    let isFocused = $state(false);
    let isDisabled = $state(false);
    let isLoading = $state(false);

    let isHovered = $state(false);

    let isBotCheckOngoing = $derived($turnstileEnabled && !$turnstileSolved);

    let linkPrefill = $derived(
        page.url.hash.replace("#", "")
        || (browser ? page.url.searchParams.get("u") : "")
        || ""
    );

    let isPlaylist = $derived(isYouTubePlaylistURL($link));
    let downloadable = $derived(validLink($link) && !isPlaylist);
    let clearVisible = $derived($link && !isLoading);

    const submitLink = () => {
        if (isPlaylist) {
            revealYouTubePlaylist();
            return;
        }
        savingHandler({ url: $link });
    };

    $effect (() => {
        if (linkPrefill) {
            // prefilled link may be uri encoded
            linkPrefill = decodeURIComponent(linkPrefill);

            if (validLink(linkPrefill)) {
                $link = linkPrefill;
            }

            // clear hash and query to prevent bookmarking unwanted links
            if (browser) goto("/", { replaceState: true });

            // clear link prefill to avoid extra effects
            linkPrefill = "";

            submitLink();
        }
    });

    const pasteClipboard = async () => {
        if ($dialogs.length > 0 || isDisabled || isLoading) {
            return;
        }

        hapticSwitch();

        const pastedData = await pasteLinkFromClipboard();
        if (!pastedData) return;

        const linkMatch = pastedData.match(/https?\:\/\/[^\s]+/g);

        if (linkMatch) {
            $link = linkMatch[0].split('，')[0];

            await tick(); // wait for button to render
            submitLink();
        }
    };

    const changeDownloadMode = (mode: DownloadModeOption) => {
        updateSetting({ save: { downloadMode: mode } });
    };

    const handleKeydown = (e: KeyboardEvent) => {
        if (!linkInput || $dialogs.length > 0 || isDisabled || isLoading) {
            return;
        }

        if (e.metaKey || e.ctrlKey || e.key === "/") {
            linkInput.focus();
        }

        if (e.key === "Enter" && validLink($link) && isFocused) {
            submitLink();
        }

        if (["Escape", "Clear"].includes(e.key) && isFocused) {
            $link = "";
        }

        if (e.target === linkInput) {
            return;
        }

        switch (e.key) {
            case "D":
                pasteClipboard();
                break;
            case "J":
                changeDownloadMode("auto");
                break;
            case "K":
                changeDownloadMode("audio");
                break;
            case "L":
                changeDownloadMode("mute");
                break;
            default:
                break;
        }
    };
</script>

<svelte:window onkeydown={handleKeydown} />

<!--
    if you want to remove the community instance label,
    refer to the license first https://github.com/imputnet/cobalt/tree/main/web#license
-->
{#if env.DEFAULT_API !== officialApiURL}
    <div id="instance-label">
        <span class="instance-dot" aria-hidden="true"></span>
        {$t("save.label.community_instance")}
    </div>
{/if}

<div id="omnibox">
    {#if $turnstileEnabled}
        <CaptchaTooltip
            visible={isBotCheckOngoing && (isHovered || isFocused)}
        />
    {/if}

    <div
        id="input-container"
        class:focused={isFocused}
        class:downloadable
        class:clear-visible={clearVisible}
        class:playlist={isPlaylist}
    >
        <OmniboxIcon loading={isLoading || isBotCheckOngoing} />

        <input
            id="link-area"
            bind:value={$link}
            bind:this={linkInput}
            oninput={() => (isFocused = true)}
            onfocus={() => (isFocused = true)}
            onblur={() => (isFocused = false)}
            onmouseover={() => (isHovered = true)}
            onmouseleave={() => (isHovered = false)}
            spellcheck="false"
            autocomplete="off"
            autocapitalize="off"
            maxlength="512"
            placeholder={$t("save.input.placeholder")}
            aria-label={isBotCheckOngoing
                ? $t("a11y.save.link_area.turnstile")
                : $t("a11y.save.link_area")}
            data-form-type="other"
            disabled={isDisabled}
        />

        <ClearButton click={() => ($link = "")} />
        {#if !isPlaylist}
            <DownloadButton
                url={$link}
                inactive={!downloadable}
                bind:disabled={isDisabled}
                bind:loading={isLoading}
            />
        {/if}
    </div>

    <div id="action-container">
        <Switcher>
            <SettingsButton
                settingContext="save"
                settingId="downloadMode"
                settingValue="auto"
            >
                <IconSparkles />
                {$t("save.auto")}
            </SettingsButton>
            <SettingsButton
                settingContext="save"
                settingId="downloadMode"
                settingValue="audio"
            >
                <IconMusic />
                {$t("save.audio")}
            </SettingsButton>
            <SettingsButton
                settingContext="save"
                settingId="downloadMode"
                settingValue="mute"
            >
                <IconMute />
                {$t("save.mute")}
            </SettingsButton>
        </Switcher>

        <ActionButton id="paste" click={pasteClipboard}>
            <IconClipboard />
            <span id="paste-desktop-text">{$t("save.paste")}</span>
            <span id="paste-mobile-text">{$t("save.paste.long")}</span>
        </ActionButton>
    </div>
</div>

<style>
    #omnibox {
        display: flex;
        flex-direction: column;
        width: 100%;
        gap: var(--spacing-16);
        position: relative;
    }

    #input-container {
        --input-padding: 16px;
        display: flex;
        align-items: center;
        gap: var(--input-padding);
        min-height: 68px;
        color: var(--color-charcoal);
        background: var(--surface-paper-white);
        border: 2px solid var(--color-charcoal);
        border-radius: 16px;
        font-size: 16px;
        flex: 1;
        padding-right: 6px;
        transition: border-color 180ms ease, background-color 180ms ease, transform 240ms var(--motion-spring);
    }

    #input-container:not(.clear-visible) :global(#clear-button) {
        display: none;
    }

    #input-container.clear-visible {
        padding-right: 6px;
    }

    :global([dir="rtl"]) #input-container.clear-visible {
        padding-right: unset;
        padding-left: var(--input-padding);
    }

    #input-container.downloadable {
        border-color: var(--color-eager-green);
    }

    #input-container.playlist {
        padding-right: var(--input-padding);
        border-color: var(--color-spark-blue);
    }

    #input-container.downloadable:dir(rtl) {
        padding-left: 0;
    }

    #input-container.focused {
        border-color: var(--color-spark-blue);
        background: color-mix(in srgb, var(--color-spark-blue) 5%, var(--surface-paper-white));
        transform: translateY(-1px);
    }

    #input-container.focused :global(#input-icons svg) {
        stroke: var(--color-spark-blue);
    }

    #input-container.downloadable :global(#input-icons svg) {
        stroke: var(--color-eager-green);
    }

    #link-area {
        display: flex;
        width: 100%;
        margin: 0;
        padding: var(--input-padding) 0;
        padding-left: calc(var(--input-padding) + 28px);
        min-width: 0;
        height: 22px;

        align-items: center;

        border: none;
        outline: none;
        background-color: transparent;
        color: var(--color-charcoal);

        -webkit-tap-highlight-color: transparent;
        flex: 1;

        font-family: var(--font-duolingo-sans);
        font-weight: 800;

        /* workaround for safari */
        font-size: inherit;

        /* prevents input from poking outside of rounded corners */
        border-radius: var(--border-radius);
    }

    :global([dir="rtl"]) #link-area {
        padding-left: unset;
        padding-right: calc(var(--input-padding) + 28px);
    }

    #link-area::placeholder {
        color: var(--color-pencil-gray);
        /* fix for firefox */
        opacity: 1;
    }

    /* fix for safari */
    input:disabled {
        opacity: 1;
    }

    #action-container {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        gap: var(--spacing-16);
        padding: 8px;
        background: color-mix(in srgb, var(--surface-paper-white) 86%, transparent);
        border: 2px solid color-mix(in srgb, var(--color-charcoal) 24%, transparent);
        border-radius: 16px;
    }

    #paste-mobile-text {
        display: none;
    }

    #instance-label {
        display: inline-flex;
        width: fit-content;
        align-items: center;
        gap: 7px;
        margin: 0 2px -8px;
        padding: 5px 9px;
        color: var(--color-charcoal);
        background: var(--surface-paper-white);
        border: 2px solid color-mix(in srgb, var(--color-charcoal) 24%, transparent);
        border-radius: 999px;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .instance-dot {
        width: 8px;
        height: 8px;
        background: var(--color-eager-green);
        border: 1.5px solid var(--color-charcoal);
        border-radius: 50%;
        animation: instance-pulse 1.8s ease-in-out infinite;
    }

    #action-container :global(.switcher) {
        gap: 5px;
        padding: 0;
        overflow: visible;
        border: 0;
        border-radius: 10px;
    }

    #action-container :global(.button) {
        min-height: 42px;
        color: var(--color-pencil-gray);
        background: transparent;
        border: 2px solid transparent;
        border-radius: 10px;
        box-shadow: none;
        font-size: 13px;
        font-weight: 800;
    }

    #action-container :global(.button.active) {
        color: var(--color-charcoal);
        background: var(--color-storybook-green);
        border-color: var(--color-eager-green);
    }

    #action-container :global(#button-paste) {
        color: var(--color-spark-blue);
        background: var(--surface-paper-white);
        border: 2px solid var(--color-spark-blue);
        border-radius: 10px;
        transition: transform 220ms var(--motion-spring), border-color 180ms ease;
    }

    #action-container :global(#button-paste:hover) {
        border-color: var(--color-spark-blue);
        transform: translateY(-2px);
    }

    @keyframes instance-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.35); }
    }

    @media screen and (max-width: 440px) {
        #action-container {
            flex-direction: column;
            align-items: stretch;
            gap: var(--spacing-8);
            padding: 7px;
        }

        #action-container :global(.button) {
            width: 100%;
        }

        #paste-mobile-text {
            display: block;
        }

        #paste-desktop-text {
            display: none;
        }

        #input-container {
            --input-padding: 12px;
            min-height: 60px;
            border-radius: 14px;
        }
    }
</style>
