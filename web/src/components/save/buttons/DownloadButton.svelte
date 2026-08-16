<script lang="ts">
    import { onDestroy } from "svelte";
    import { t } from "$lib/i18n/translations";
    import { hapticSwitch } from "$lib/haptics";
    import { savingHandler } from "$lib/api/saving-handler";
    import { downloadButtonState } from "$lib/state/omnibox";

    import type { CobaltDownloadButtonState } from "$lib/types/omnibox";

    export let url: string;
    export let disabled = false;
    export let loading = false;

    $: buttonText = ">>";
    $: buttonAltText = $t("a11y.save.download");

    type DownloadButtonState = "idle" | "think" | "check" | "done" | "error";

    const unsubscribe = downloadButtonState.subscribe(
        (state: CobaltDownloadButtonState) => {
            disabled = state !== "idle";
            loading = state === "think" || state === "check";

            buttonText = {
                idle: ">>",
                think: "...",
                check: "..?",
                done: ">>>",
                error: "!!",
            }[state];

            buttonAltText = $t(
                {
                    idle: "a11y.save.download",
                    think: "a11y.save.download.think",
                    check: "a11y.save.download.check",
                    done: "a11y.save.download.done",
                    error: "a11y.save.download.error",
                }[state]
            );

            // states that don't wait for anything, and thus can
            // transition back to idle after some period of time.
            const final: DownloadButtonState[] = ["done", "error"];
            if (final.includes(state)) {
                setTimeout(() => downloadButtonState.set("idle"), 1500);
            }
        }
    );

    onDestroy(() => unsubscribe());
</script>

<button
    id="download-button"
    {disabled}
    on:click={() => {
        hapticSwitch();
        savingHandler({ url });
    }}
    aria-label={buttonAltText}
>
    <span id="download-state">{buttonText}</span>
    <span id="download-label">{buttonAltText}</span>
</button>

<style>
    #download-button {
        display: flex;
        align-items: center;
        justify-content: center;

        align-self: center;
        min-width: 146px;
        min-height: 54px;
        padding: 0 20px;
        gap: 10px;

        color: var(--color-paper-white);
        background: var(--color-eager-green);
        box-shadow: none;
        transform: none;
        border: 2px solid var(--color-charcoal);
        border-radius: 12px;
        font-weight: 900;
        transition: filter 180ms ease, transform 220ms var(--motion-spring);
    }

    #download-button:dir(rtl) {
        direction: ltr;
        padding: 0 18px;
    }

    #download-state {
        font-size: 19px;
        font-family: "Noto Sans Mono", "IBM Plex Mono", monospace;
        font-weight: 400;

        text-align: center;
        text-indent: -5px;
        letter-spacing: -5.3px;

        margin-bottom: 1px;
    }

    #download-label {
        font-size: 13px;
        font-weight: 900;
        letter-spacing: 0.06em;
        line-height: 1.1;
        text-transform: uppercase;
    }

    #download-button:disabled {
        cursor: unset;
        color: var(--color-paper-white);
        opacity: 0.72;
    }

    @media (hover: hover) {
        #download-button:hover:not(:disabled) {
            background: var(--color-eager-green);
            filter: brightness(0.96);
            transform: translateY(-2px);
        }
    }

    #download-button:active:not(:disabled) {
        background: var(--color-eager-green);
        transform: scale(0.97);
    }

    @media screen and (max-width: 520px) {
        #download-button {
            min-width: 52px;
            width: 52px;
            min-height: 48px;
            padding: 0 13px;
        }

        #download-label {
            display: none;
        }
    }
</style>
