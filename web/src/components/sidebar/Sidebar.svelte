<script lang="ts">
    import settings from "$lib/state/settings";

    import { t } from "$lib/i18n/translations";
    import { defaultNavPage } from "$lib/subnav";

    import CobaltLogo from "$components/sidebar/CobaltLogo.svelte";
    import SidebarTab from "$components/sidebar/SidebarTab.svelte";

    import IconDownload from "@tabler/icons-svelte/IconDownload.svelte";
    import IconSettings from "@tabler/icons-svelte/IconSettings.svelte";

    import IconRepeat from "@tabler/icons-svelte/IconRepeat.svelte";

    import IconInfoCircle from "@tabler/icons-svelte/IconInfoCircle.svelte";

    let screenWidth: number;
    let settingsLink = defaultNavPage("settings");
    let aboutLink = defaultNavPage("about");

    $: screenWidth,
        (settingsLink = defaultNavPage("settings")),
        (aboutLink = defaultNavPage("about"));
</script>

<svelte:window bind:innerWidth={screenWidth} />

<nav id="sidebar" aria-label={$t("a11y.tabs.tab_panel")}>
    <CobaltLogo />
    <div id="sidebar-tabs" role="tablist">
        <div id="sidebar-actions" class="sidebar-inner-container">
            <SidebarTab name="save" path="/" icon={IconDownload} />
            {#if !$settings.appearance.hideRemuxTab}
                <SidebarTab name="remux" path="/remux" icon={IconRepeat} beta />
            {/if}
        </div>
        <div id="sidebar-info" class="sidebar-inner-container">
            <SidebarTab name="settings" path={settingsLink} icon={IconSettings} />
            <SidebarTab name="about" path={aboutLink} icon={IconInfoCircle} />
        </div>
    </div>
</nav>

<style>
    #sidebar,
    #sidebar-tabs,
    .sidebar-inner-container {
        display: flex;
        flex-direction: row;
        align-items: center;
    }

    #sidebar {
        background: var(--sidebar-bg);
        min-height: var(--app-header-height);
        width: 100%;
        justify-content: center;
        border-bottom: 2px solid var(--border-subtle);
        z-index: 10;
        padding: 0 max(12px, calc((100% - var(--page-max-width)) / 2));
    }

    #sidebar-tabs {
        width: auto;
        min-width: 0;
        flex: 1;
        height: var(--app-header-height);
        justify-content: space-between;
        overflow: visible;
    }

    .sidebar-inner-container {
        gap: 4px;
    }

    #sidebar-actions {
        margin-right: auto;
    }

    #sidebar-info {
        margin-left: auto;
    }

    @media screen and (max-width: 535px) {
        #sidebar,
        #sidebar-tabs,
        .sidebar-inner-container {
            flex-direction: row;
        }

        #sidebar {
            width: 100%;
            height: var(--sidebar-height-mobile);
            min-height: var(--sidebar-height-mobile);
            position: fixed;
            bottom: 0;
            justify-content: center;
            align-items: center;
            z-index: 20;
            padding: var(--sidebar-inner-padding) 0;
            border-top: 2px solid var(--border-subtle);
            border-bottom: none;
        }

        #sidebar::before {
            display: none;
        }

        #sidebar-tabs {
            overflow-y: visible;
            overflow-x: scroll;
            padding: 0;
            width: 100%;
            height: fit-content;
        }

        .sidebar-inner-container {
            gap: 0;
        }

        #sidebar-actions,
        #sidebar-info {
            margin: 0;
        }

        #sidebar :global(.sidebar-inner-container:first-child) {
            padding-left: var(--spacing-12);
        }

        #sidebar :global(.sidebar-inner-container:last-child) {
            padding-right: var(--spacing-12);
        }

        #sidebar :global(.sidebar-inner-container:first-child:dir(rtl)) {
            padding-left: 0;
            padding-right: calc(var(--border-radius) * 1.5);
        }

        #sidebar :global(.sidebar-inner-container:last-child:dir(rtl)) {
            padding-right: 0;
            padding-left: calc(var(--border-radius) * 1.5);
        }
    }

    /* add padding for notch / dynamic island in landscape */
    @media screen and (orientation: landscape) {
        :global([data-iphone="true"]) #sidebar {
            padding-left: env(safe-area-inset-left);
        }
    }
</style>
