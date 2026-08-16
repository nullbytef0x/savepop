<script lang="ts">
    import { page } from "$app/stores";

    import { t } from "$lib/i18n/translations";

    export let name: string;
    export let path: string;
    export let icon: ConstructorOfATypedSvelteComponent;

    export let beta = false;

    const firstTabPage = ["save", "remux", "settings"];

    let tab: HTMLElement;

    $: currentTab = $page.url.pathname.split("/")[1];
    $: baseTabPath = path.split("/")[1];

    $: isTabActive = currentTab === baseTabPath;

    const showTab = (e: HTMLElement) => {
        if (e) {
            e.scrollIntoView({
                inline: firstTabPage.includes(name) ? "end" : "start",
                block: "nearest",
                behavior: "smooth",
            });
        }
    };

    $: if (isTabActive && tab) {
        showTab(tab);
    }
</script>

<a
    id="sidebar-tab-{name}"
    class="sidebar-tab"
    class:active={isTabActive}
    href={path}
    bind:this={tab}
    on:focus={() => showTab(tab)}
    role="tab"
    aria-selected={isTabActive}
>
    {#if beta}
        <div class="beta-sign" aria-label={$t("general.beta")}>β</div>
    {/if}

    <svelte:component this={icon} />
    <span class="tab-title">{$t(`tabs.${name}`)}</span>
</a>

<style>
    .sidebar-tab {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        flex-direction: row;
        gap: 7px;
        min-height: 44px;
        padding: 0 12px;
        color: var(--sidebar-highlight);
        font-size: 13px;
        font-weight: 800;
        opacity: 0.68;
        height: fit-content;
        border: 2px solid transparent;
        border-radius: var(--radius-nav-items);
        transition: transform 220ms var(--motion-spring), background-color 160ms ease, border-color 160ms ease;

        text-decoration: none;
        text-decoration-line: none;
        position: relative;
        scroll-behavior: smooth;

        cursor: pointer;
    }

    .sidebar-tab :global(svg) {
        stroke-width: 2.2px;
        height: 20px;
        width: 20px;
    }

    :global([data-iphone="true"] .sidebar-tab svg) {
        will-change: transform;
    }

    .sidebar-tab.active {
        color: var(--color-charcoal);
        background: var(--color-storybook-green);
        border-color: var(--color-eager-green);
        opacity: 1;
        transform: none;
        transition: none;
        animation: pressButton 0.3s;
        cursor: default;
    }

    .sidebar-tab:not(.active):active {
        transform: scale(0.95);
    }

    :global([data-reduce-motion="true"]) .sidebar-tab:active {
        transform: none;
    }

    .beta-sign {
        position: absolute;
        top: -5px;
        right: 2px;
        transform: none;
        opacity: 0.7;
    }

    .tab-title {
        white-space: nowrap;
    }

    .sidebar-tab:active:not(.active) {
        opacity: 1;
    }

    @keyframes pressButton {
        0% {
            transform: scale(0.9);
        }
        50% {
            transform: scale(1.015);
        }
        100% {
            transform: scale(1);
        }
    }

    @media (hover: hover) {
        .sidebar-tab:hover:not(.active) {
            background-color: var(--button-hover-transparent);
            border-color: var(--color-faded-gray);
            transform: translateY(-2px);
        }

        .sidebar-tab:active:not(.active),
        .sidebar-tab:focus:hover:not(.active) {
            background-color: var(--button-press-transparent);
        }

        .sidebar-tab:hover:not(.active) {
            opacity: 1;
        }

        .sidebar-tab:active:not(.active),
        .sidebar-tab:focus:hover:not(.active) {
            opacity: 1;
            box-shadow: 0 0 0 1px var(--sidebar-stroke) inset;
        }
    }

    @media screen and (max-width: 535px) {
        .sidebar-tab {
            flex-direction: column;
            gap: 2px;
            min-width: 66px;
            min-height: 48px;
            padding: 5px 8px;
            font-size: 10px;
            border-radius: 10px;
        }

        .sidebar-tab :global(svg) {
            width: 21px;
            height: 21px;
        }

        .sidebar-tab.active {
            z-index: 2;
        }

        .sidebar-tab:active:not(.active) {
            transform: scale(0.9);
        }

        @keyframes pressButton {
            0% {
                transform: scale(0.8);
            }
            50% {
                transform: scale(1.02);
            }
            100% {
                transform: scale(1);
            }
        }
    }
</style>
