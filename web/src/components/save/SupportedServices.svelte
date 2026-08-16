<script lang="ts">
    import { onMount } from "svelte";
    import { t } from "$lib/i18n/translations";
    import cachedInfo from "$lib/state/server-info";
    import { getServerInfo } from "$lib/api/server-info";
    import ServiceIcon from "$components/save/ServiceIcon.svelte";

    const defaultServices = [
        "youtube",
        "tiktok",
        "instagram",
        "twitter",
        "facebook",
        "reddit",
        "twitch clips",
        "vimeo",
        "soundcloud",
        "pinterest",
        "snapchat",
        "bluesky",
        "bilibili",
        "dailymotion",
        "loom",
        "newgrounds",
        "ok.ru",
        "rutube",
        "streamable",
        "tumblr",
        "vk",
    ];

    let services = defaultServices;

    onMount(async () => {
        await getServerInfo();

        if ($cachedInfo?.info.cobalt.services?.length) {
            services = $cachedInfo.info.cobalt.services;
        }
    });
</script>

<section id="supported-services" aria-labelledby="services-heading">
    <div class="services-copy">
        <span class="eyebrow">{$t("home.services.eyebrow")}</span>
        <h2 id="services-heading">{$t("home.services.title")}</h2>
        <p>{$t("home.services.description")}</p>
    </div>

    <div class="service-rail" aria-label={$t("save.services.title")}>
        <div class="service-track">
            <div class="service-set">
                {#each services as service}
                    <div class="service-item">
                        <ServiceIcon name={service} />
                        <span>{service}</span>
                    </div>
                {/each}
            </div>
            <div class="service-set duplicate" aria-hidden="true">
                {#each services as service}
                    <div class="service-item">
                        <ServiceIcon name={service} />
                        <span>{service}</span>
                    </div>
                {/each}
            </div>
        </div>
    </div>

    <p class="service-disclaimer">{$t("save.services.disclaimer")}</p>
</section>

<style>
    #supported-services {
        display: flex;
        width: 100%;
        flex-direction: column;
        gap: var(--spacing-32);
        padding: var(--spacing-80) 0;
        overflow: hidden;
        border-top: 2px solid var(--border-subtle);
    }

    .services-copy {
        width: min(calc(100% - 48px), var(--page-max-width));
        margin: 0 auto;
        text-align: center;
    }

    .eyebrow {
        display: block;
        color: var(--color-spark-blue);
        font-size: var(--text-nav-label);
        font-weight: 800;
        letter-spacing: var(--tracking-nav-label);
        text-transform: uppercase;
        margin-bottom: var(--spacing-12);
    }

    h2 {
        color: var(--color-eager-green);
        font-family: var(--font-feather);
        font-size: clamp(36px, 5vw, var(--text-heading));
        font-weight: 900;
        letter-spacing: var(--tracking-heading);
        line-height: var(--leading-heading);
    }

    .services-copy p,
    .service-disclaimer {
        color: var(--color-pencil-gray);
        font-size: var(--text-body);
        line-height: 1.5;
    }

    .services-copy p {
        max-width: 650px;
        margin: var(--spacing-12) auto 0;
    }

    .service-rail {
        width: 100%;
        overflow: hidden;
    }

    .service-track,
    .service-set {
        display: flex;
        align-items: center;
        width: max-content;
    }

    .service-track {
        animation: service-marquee 42s linear infinite;
        will-change: transform;
    }

    .service-rail:hover .service-track,
    .service-rail:focus-within .service-track {
        animation-play-state: paused;
    }

    .service-set {
        gap: var(--spacing-12);
        padding-right: var(--spacing-12);
    }

    .service-item {
        display: inline-flex;
        min-height: 52px;
        align-items: center;
        gap: 10px;
        padding: 0 18px;
        color: var(--color-charcoal);
        background: var(--surface-paper-white);
        border: 2px solid var(--color-faded-gray);
        border-radius: var(--radius-xl);
        font-size: 15px;
        font-weight: 800;
        text-transform: capitalize;
        white-space: nowrap;
        transition: transform 280ms var(--motion-spring), border-color 180ms ease;
    }

    .service-item :global(.service-icon) {
        color: var(--color-spark-blue);
        font-size: 24px;
    }

    .service-item:hover {
        border-color: var(--color-spark-blue);
        transform: translateY(-5px) rotate(-1deg);
    }

    .service-item:nth-child(3n):hover {
        transform: translateY(-5px) rotate(1deg);
    }

    .service-disclaimer {
        width: min(calc(100% - 48px), 760px);
        margin: 0 auto;
        font-size: var(--text-caption);
        text-align: center;
    }

    @keyframes service-marquee {
        to {
            transform: translateX(-50%);
        }
    }

    @media screen and (max-width: 640px) {
        #supported-services {
            padding: var(--spacing-64) 0;
        }

        .services-copy,
        .service-disclaimer {
            width: min(calc(100% - 32px), var(--page-max-width));
        }

        .service-item {
            min-height: 46px;
            padding: 0 14px;
            font-size: 14px;
        }
    }

    :global([data-reduce-motion="true"]) .service-track {
        animation: none;
        display: block;
        width: auto;
        padding: 0 var(--spacing-16);
    }

    :global([data-reduce-motion="true"]) .service-set {
        flex-wrap: wrap;
        width: auto;
        justify-content: center;
    }

    :global([data-reduce-motion="true"]) .duplicate {
        display: none;
    }
</style>
