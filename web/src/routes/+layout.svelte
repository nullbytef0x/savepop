<script lang="ts">
    import "../app.css";
    import "../fonts/noto-mono-cobalt.css";

    import "@fontsource/nunito/500.css";
    import "@fontsource/nunito/600.css";
    import "@fontsource/nunito/700.css";
    import "@fontsource/nunito/800.css";
    import "@fontsource/nunito/900.css";

    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { updated } from "$app/stores";
    import { browser } from "$app/environment";
    import { afterNavigate } from "$app/navigation";

    import "$lib/polyfills";
    import env from "$lib/env";
    import locale from "$lib/i18n/locale";
    import settings from "$lib/state/settings";

    import { t } from "$lib/i18n/translations";

    import { device, app } from "$lib/device";
    import { getServerInfo } from "$lib/api/server-info";
    import currentTheme, { statusBarColors } from "$lib/state/theme";
    import { turnstileCreated, turnstileEnabled } from "$lib/state/turnstile";

    import Sidebar from "$components/sidebar/Sidebar.svelte";
    import Turnstile from "$components/misc/Turnstile.svelte";
    import NotchSticker from "$components/misc/NotchSticker.svelte";
    import DialogHolder from "$components/dialog/DialogHolder.svelte";
    import ProcessingQueue from "$components/queue/ProcessingQueue.svelte";
    import UpdateNotification from "$components/misc/UpdateNotification.svelte";

    $: reduceMotion =
        $settings.accessibility.reduceMotion || device.prefers.reducedMotion;

    $: reduceTransparency =
        $settings.accessibility.reduceTransparency ||
        device.prefers.reducedTransparency;

    $: preloadAssets = false;
    $: plausibleLoaded = false;

    afterNavigate(async () => {
        const to_focus: HTMLElement | null =
            document.querySelector("[data-first-focus]");
        to_focus?.focus();

        if ($page.url.pathname === "/") {
            await getServerInfo();
        }
    });

    onMount(() => {
        preloadAssets = true;
    });
</script>

<svelte:head>
    {#if $page.url.pathname !== "/"}
        <meta name="description" content={$t("general.embed.description")} />
        <meta property="og:description" content={$t("general.embed.description")} />
    {/if}

    {#if env.HOST && $page.url.pathname !== "/"}
        <meta
            property="og:url"
            content="https://{env.HOST}{$page.url.pathname}"
        />
    {/if}

    {#if device.is.mobile}
        <meta
            name="theme-color"
            content={statusBarColors.mobile[$currentTheme]}
        />
    {:else}
        <meta
            name="theme-color"
            content={statusBarColors.desktop[$currentTheme]}
        />
    {/if}

    {#if plausibleLoaded || (browser && env.PLAUSIBLE_ENABLED && !$settings.privacy.disableAnalytics)}
        <script
            defer
            data-domain={env.HOST}
            on:load={() => {
                plausibleLoaded = true;
            }}
            src="https://{env.PLAUSIBLE_HOST}/js/script.js"
        ></script>
    {/if}
</svelte:head>

<div
    style="display: contents"
    data-theme={browser ? $currentTheme : undefined}
    lang={$locale}
>
    {#if preloadAssets}
        <div id="preload" aria-hidden="true">??</div>
    {/if}
    <div
        id="cobalt"
        class:loaded={browser}
        data-chrome={device.browser.chrome}
        data-iphone={device.is.iPhone}
        data-mobile={device.is.mobile}
        data-reduce-motion={reduceMotion}
        data-reduce-transparency={reduceTransparency}
    >
        {#if device.is.iPhone && app.is.installed}
            <NotchSticker />
        {/if}
        <DialogHolder />
        <Sidebar />
        {#if $updated}
            <UpdateNotification />
        {/if}
        <ProcessingQueue />
        <div id="content">
            {#if ($turnstileEnabled && $page.url.pathname === "/") || $turnstileCreated}
                <Turnstile />
            {/if}
            <slot></slot>
        </div>
    </div>
</div>

<style>
    #cobalt {
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background-color: var(--sidebar-bg);
        color: var(--color-charcoal);
        position: fixed;
    }

    #content {
        display: flex;
        flex: 1;
        width: 100%;
        min-height: 0;
        overflow: scroll;
        background-color: var(--primary);
        margin: 0;
        scroll-behavior: smooth;
    }

    @media screen and (max-width: 535px) {
        #cobalt {
            display: flex;
        }

        #content {
            padding-top: env(safe-area-inset-top);
            padding-bottom: calc(var(--sidebar-height-mobile) + var(--sidebar-inner-padding) * 2);
        }
    }

    /* preload assets to prevent flickering when they appear on screen */
    #preload {
        width: 0;
        height: 0;
        position: absolute;
        z-index: -10;
        content: url(/meowbalt/smile.png) url(/meowbalt/error.png)
            url(/meowbalt/question.png) url(/meowbalt/think.png);

        font-family: "Noto Sans Mono";
        font-size: 0;
        opacity: 0;

        pointer-events: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-user-drag: none;
    }
</style>
