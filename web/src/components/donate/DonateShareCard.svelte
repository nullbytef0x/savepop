<script lang="ts">
    import { browser } from "$app/environment";
    import { contacts } from "$lib/env";
    import { device } from "$lib/device";
    import locale from "$lib/i18n/locale";
    import { t } from "$lib/i18n/translations";
    import { hapticConfirm } from "$lib/haptics";

    import { openURL, copyURL, shareURL } from "$lib/download";

    import DonateCardContainer from "$components/donate/DonateCardContainer.svelte";

    import IconShare2 from "@tabler/icons-svelte/IconShare2.svelte";
    import IconBrandGithub from "@tabler/icons-svelte/IconBrandGithub.svelte";
    import IconBrandTwitter from "@tabler/icons-svelte/IconBrandTwitter.svelte";
    import IconMoodSmileBeam from "@tabler/icons-svelte/IconMoodSmileBeam.svelte";

    import CopyIcon from "$components/misc/CopyIcon.svelte";

    const savePopUrl = browser ? `${window.location.origin}/` : "/";

    let copied = false;

    $: if (copied) {
        setTimeout(() => {
            copied = false;
        }, 1500);
    }
</script>

<DonateCardContainer id="share-box">
    <div id="share-card-header">
        <div class="share-header-icon"><IconMoodSmileBeam /></div>
        <div class="donate-card-title">{$t("donate.share.title")}</div>
    </div>
    <div id="share-card-body">
        <div id="share-brand" aria-hidden="true">
            <span>S</span>
            <strong>SavePop</strong>
        </div>
        <div id="action-buttons">
            <button
                id="action-button-copy"
                class="action-button"
                on:click={async () => {
                    if (!copied) {
                        copyURL(savePopUrl);
                        hapticConfirm();
                        copied = true;
                    }
                }}
                aria-label={copied ? $t("button.copied") : ""}
            >
                <div class="action-button-icon">
                    <CopyIcon check={copied} />
                </div>
                {$t("button.copy")}
            </button>

            {#if device.supports.share}
                <button
                    id="action-button-share"
                    class="action-button"
                    on:click={async () => shareURL(savePopUrl)}
                >
                    <div class="action-button-icon">
                        <IconShare2 />
                    </div>
                    {$t("button.share")}
                </button>
            {/if}

            <button
                id="action-button-github"
                class="action-button"
                on:click={async () => openURL(contacts.github)}
            >
                <div class="action-button-icon">
                    <IconBrandGithub />
                </div>
                {$t("button.star")}
            </button>

            {#if $locale !== "ru"}
                <button
                    id="action-button-twitter"
                    class="action-button"
                    on:click={async () => openURL(contacts.twitter)}
                >
                    <div class="action-button-icon">
                        <IconBrandTwitter />
                    </div>
                    {$t("button.follow")}
                </button>
            {/if}
        </div>
    </div>
    <div class="donate-card-subtitle share-footer-link">
        SavePop
    </div>
</DonateCardContainer>

<style>
    :global(#share-box) {
        padding: var(--donate-card-main-padding);
        min-width: 320px;
        width: fit-content;
        transition: box-shadow 0.15s;
    }

    #share-card-header {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .share-header-icon {
        display: flex;
    }

    .share-header-icon :global(svg) {
        width: 28px;
        height: 28px;
        stroke-width: 1.8px;
    }

    #share-card-body {
        display: flex;
        flex-direction: row;
        gap: 12px;
    }

    #share-brand {
        display: flex;
        width: 132px;
        min-width: 132px;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 6px;
        aspect-ratio: 1 / 1;
        color: var(--color-charcoal);
        background: var(--color-storybook-green);
        border: 2px solid var(--color-charcoal);
        border-radius: 12px;
    }

    #share-brand span {
        display: flex;
        width: 54px;
        height: 54px;
        align-items: center;
        justify-content: center;
        color: white;
        background: var(--color-eager-green);
        border: 2px solid var(--color-charcoal);
        border-radius: 12px;
        font-family: var(--font-feather);
        font-size: 34px;
        font-weight: 900;
    }

    #share-brand strong {
        font-family: var(--font-feather);
        font-size: 16px;
        font-weight: 900;
    }

    #action-buttons {
        display: grid;
        grid-template-columns: 1fr 1fr;
        width: 100%;
        gap: 6px;
    }

    .action-button {
        align-items: center;
        width: 100%;
        padding: 0 6px;
        font-size: 13px;
        gap: 2px;
    }

    .action-button-icon {
        width: 21px;
        height: 21px;
        display: flex;
    }

    .action-button-icon :global(svg) {
        width: 21px;
        height: 21px;
        stroke-width: 1.8px;
    }

    @media screen and (max-width: 760px) {
        :global(#share-box) {
            width: calc(100% - var(--donate-card-main-padding) * 2);
            background: var(--donate-gradient-start);
            min-width: unset;
        }
    }
</style>
