<script lang="ts">
    import env from "$lib/env";
    import { t } from "$lib/i18n/translations";
    import { reveal } from "$lib/motion/reveal";

    import Omnibox from "$components/save/Omnibox.svelte";
    import YouTubePlaylist from "$components/save/YouTubePlaylist.svelte";
    import Meowbalt from "$components/misc/Meowbalt.svelte";
    import ServiceIcon from "$components/save/ServiceIcon.svelte";
    import SupportedServices from "$components/save/SupportedServices.svelte";

    import IconArrowDown from "@tabler/icons-svelte/IconArrowDown.svelte";
    import IconCheck from "@tabler/icons-svelte/IconCheck.svelte";
    import IconDownload from "@tabler/icons-svelte/IconDownload.svelte";
    import IconFileCheck from "@tabler/icons-svelte/IconFileCheck.svelte";
    import IconLink from "@tabler/icons-svelte/IconLink.svelte";
    import IconLock from "@tabler/icons-svelte/IconLock.svelte";
    import IconMusic from "@tabler/icons-svelte/IconMusic.svelte";
    import IconPhoto from "@tabler/icons-svelte/IconPhoto.svelte";
    import IconSettings from "@tabler/icons-svelte/IconSettings.svelte";
    import IconShieldCheck from "@tabler/icons-svelte/IconShieldCheck.svelte";
    import IconSparkles from "@tabler/icons-svelte/IconSparkles.svelte";
    import IconVideo from "@tabler/icons-svelte/IconVideo.svelte";

    const canonical = env.HOST ? `https://${env.HOST}/` : undefined;
    const socialImage = env.HOST
        ? `https://${env.HOST}/icons/savepop-512.png`
        : "/icons/savepop-512.png";
    const description = "Download public videos, audio and photos from YouTube, TikTok, Instagram, X and 17+ platforms. Free, private, ad-free and open source.";

    const structuredData = JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebApplication",
                name: "SavePop",
                url: canonical,
                applicationCategory: "MultimediaApplication",
                operatingSystem: "Any",
                description,
                isAccessibleForFree: true,
                offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "USD",
                },
            },
            {
                "@type": "FAQPage",
                mainEntity: [
                    {
                        "@type": "Question",
                        name: "Is SavePop free to use?",
                        acceptedAnswer: {
                            "@type": "Answer",
                            text: "Yes. SavePop is a free and open-source media downloader without ads or paid tiers.",
                        },
                    },
                    {
                        "@type": "Question",
                        name: "Which websites does SavePop support?",
                        acceptedAnswer: {
                            "@type": "Answer",
                            text: "SavePop supports public media from YouTube, TikTok, Instagram, X, Reddit, Twitch, Vimeo, SoundCloud and many more services.",
                        },
                    },
                    {
                        "@type": "Question",
                        name: "Does SavePop store downloaded videos?",
                        acceptedAnswer: {
                            "@type": "Answer",
                            text: "No. SavePop streams media for the request and does not permanently store downloaded files on its servers.",
                        },
                    },
                ],
            },
        ],
    });

    const proofPoints = ["private", "ads", "account"];
    const steps = [
        { id: "one", icon: IconLink },
        { id: "two", icon: IconSettings },
        { id: "three", icon: IconFileCheck },
    ];
    const privacyPoints = ["one", "two", "three"];
    const formats = [
        { id: "video", icon: IconVideo },
        { id: "audio", icon: IconMusic },
        { id: "subtitles", icon: IconPhoto },
        { id: "local", icon: IconShieldCheck },
    ];
    const faqs = ["one", "two", "three", "four"];
</script>

<svelte:head>
    <title>Free Video Downloader for YouTube, TikTok & More | SavePop</title>
    <meta name="description" content={description} />
    <meta name="keywords" content="video downloader, youtube downloader, tiktok downloader, instagram video downloader, download video, audio downloader, SavePop" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="SavePop — save what you love" />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={socialImage} />
    <meta property="og:image:width" content="512" />
    <meta property="og:image:height" content="512" />
    <meta property="og:image:alt" content="SavePop media downloader" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="SavePop — free, private media downloader" />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content={socialImage} />
    {#if canonical}
        <link rel="canonical" href={canonical} />
        <meta property="og:url" content={canonical} />
    {/if}
    {@html `<script type="application/ld+json">${structuredData}<\/script>`}
</svelte:head>

<div id="home-page">
    <main>
        <section id="download" class="hero-section">
            <div class="hero-grid">
                <div class="hero-copy">
                    <div class="hero-eyebrow motion-enter motion-enter-1">
                        <IconSparkles />
                        <span>{$t("home.eyebrow")}</span>
                    </div>

                    <h1 class="motion-enter motion-enter-2">
                        <span>{$t("home.hero.title.before")}</span>
                        <span class="hero-accent">{$t("home.hero.title.accent")}</span>
                    </h1>

                    <p class="hero-description motion-enter motion-enter-3">
                        {$t("home.hero.description")}
                    </p>
                </div>

                <div class="hero-visual motion-enter motion-enter-3" aria-hidden="true">
                    <div class="mascot-stage">
                        <div class="mascot-orbit orbit-one"></div>
                        <div class="mascot-orbit orbit-two"></div>
                        <div class="mascot-bubble youtube-bubble">
                            <ServiceIcon name="youtube" />
                        </div>
                        <div class="mascot-bubble tiktok-bubble">
                            <ServiceIcon name="tiktok" />
                        </div>
                        <div class="mascot-bubble instagram-bubble">
                            <ServiceIcon name="instagram" />
                        </div>
                        <div class="mascot-bubble facebook-bubble">
                            <ServiceIcon name="facebook" />
                        </div>
                        <div class="mascot-art">
                            <Meowbalt emotion="smile" />
                        </div>
                        <div class="mascot-note">
                            <span class="status-dot"></span>
                            {$t("home.mascot.ready")}
                        </div>
                    </div>
                </div>

                <div class="download-card motion-enter motion-enter-4">
                    <div class="download-card-heading">
                        <div class="download-step" aria-hidden="true">1</div>
                        <div class="download-title-group">
                            <span class="download-label">{$t("home.hero.input_label")}</span>
                            <span class="download-hint">{$t("home.hero.input_hint")}</span>
                        </div>
                        <div class="download-icon" aria-hidden="true"><IconDownload /></div>
                    </div>
                    <Omnibox />
                    <div class="download-card-footer">
                        <p class="download-helper">{$t("home.hero.helper")}</p>
                        <div class="proof-row motion-enter motion-enter-5">
                            {#each proofPoints as point}
                                <span><IconCheck /> {$t(`home.proof.${point}`)}</span>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>

            <YouTubePlaylist />

            <a class="scroll-cue" href="#how-it-works">
                <span>{$t("home.hero.scroll")}</span>
                <IconArrowDown />
            </a>
        </section>

        <SupportedServices />

        <section id="how-it-works" class="content-section steps-section" use:reveal>
            <div class="section-heading centered">
                <span class="section-eyebrow">{$t("home.steps.eyebrow")}</span>
                <h2>{$t("home.steps.title")}</h2>
                <p>{$t("home.steps.description")}</p>
            </div>

            <div class="steps-list">
                {#each steps as step, index}
                    <article class="step" use:reveal={{ delay: index * 100, distance: 18 }}>
                        <div class="step-number">0{index + 1}</div>
                        <div class="step-icon">
                            <svelte:component this={step.icon} />
                        </div>
                        <div>
                            <h3>{$t(`home.steps.${step.id}.title`)}</h3>
                            <p>{$t(`home.steps.${step.id}.description`)}</p>
                        </div>
                    </article>
                {/each}
            </div>
        </section>

        <section class="content-section split-section privacy-section" use:reveal>
            <div class="feature-copy">
                <span class="section-eyebrow">{$t("home.privacy.eyebrow")}</span>
                <h2>{$t("home.privacy.title")}</h2>
                <p>{$t("home.privacy.description")}</p>
                <ul>
                    {#each privacyPoints as point}
                        <li><IconCheck /> {$t(`home.privacy.point.${point}`)}</li>
                    {/each}
                </ul>
                <a class="outline-link" href="/about/privacy">{$t("home.footer.privacy")}</a>
            </div>

            <div class="feature-visual privacy-visual" aria-hidden="true">
                <div class="privacy-ring ring-large"></div>
                <div class="privacy-ring ring-small"></div>
                <div class="shield-sticker"><IconLock /></div>
                <div class="privacy-ticket ticket-one">no logs</div>
                <div class="privacy-ticket ticket-two">private</div>
            </div>
        </section>

        <section class="content-section split-section quality-section" use:reveal>
            <div class="feature-visual format-visual" aria-hidden="true">
                <div class="format-stack">
                    {#each formats as format, index}
                        <div class="format-card format-card-{index}">
                            <svelte:component this={format.icon} />
                            <span>{$t(`home.quality.${format.id}`)}</span>
                        </div>
                    {/each}
                </div>
            </div>

            <div class="feature-copy">
                <span class="section-eyebrow">{$t("home.quality.eyebrow")}</span>
                <h2>{$t("home.quality.title")}</h2>
                <p>{$t("home.quality.description")}</p>
                <a class="primary-link" href="/settings/video">{$t("home.footer.settings")}</a>
            </div>
        </section>

        <section class="content-section faq-section" use:reveal>
            <div class="section-heading">
                <span class="section-eyebrow">{$t("home.faq.eyebrow")}</span>
                <h2>{$t("home.faq.title")}</h2>
            </div>

            <div class="faq-list">
                {#each faqs as faq}
                    <details>
                        <summary>{$t(`home.faq.${faq}.question`)}</summary>
                        <p>{$t(`home.faq.${faq}.answer`)}</p>
                    </details>
                {/each}
            </div>
        </section>
    </main>

    <footer class="site-footer">
        <div class="footer-inner">
            <div class="footer-brand">
                <h2>{$t("home.footer.title")}</h2>
                <p>{$t("home.footer.description")}</p>
            </div>

            <div class="footer-links">
                <div>
                    <h3>{$t("home.footer.product")}</h3>
                    <a href="#download">{$t("home.footer.save")}</a>
                    <a href="/remux">{$t("home.footer.remux")}</a>
                    <a href="/settings">{$t("home.footer.settings")}</a>
                </div>
                <div>
                    <h3>{$t("home.footer.project")}</h3>
                    <a href="/about">{$t("home.footer.about")}</a>
                    <a href="https://github.com/imputnet/cobalt" rel="noreferrer">{$t("home.footer.github")}</a>
                </div>
                <div>
                    <h3>{$t("home.footer.legal")}</h3>
                    <a href="/about/privacy">{$t("home.footer.privacy")}</a>
                    <a href="/about/terms">{$t("home.footer.terms")}</a>
                </div>
            </div>
        </div>
        <p class="footer-note">{$t("home.footer.note")}</p>
    </footer>
</div>

<style>
    #home-page {
        width: 100%;
        color: var(--color-charcoal);
        background: var(--surface-paper-white);
    }

    main {
        width: 100%;
    }

    .hero-section {
        position: relative;
        display: flex;
        min-height: min(780px, calc(100svh - var(--app-header-height)));
        flex-direction: column;
        justify-content: center;
        padding: clamp(28px, 5vh, 52px) 24px var(--spacing-40);
        overflow: hidden;
    }

    .hero-grid,
    .content-section,
    .footer-inner,
    .footer-note {
        width: min(100%, var(--page-max-width));
        margin: 0 auto;
    }

    .hero-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.12fr) minmax(300px, 0.72fr);
        align-items: center;
        column-gap: clamp(36px, 7vw, 92px);
        row-gap: var(--spacing-24);
    }

    .hero-copy {
        max-width: 700px;
    }

    .hero-eyebrow,
    .section-eyebrow {
        color: var(--color-spark-blue);
        font-size: var(--text-nav-label);
        font-weight: 800;
        letter-spacing: var(--tracking-nav-label);
        text-transform: uppercase;
    }

    .hero-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-8);
        margin-bottom: var(--spacing-16);
    }

    .hero-eyebrow :global(svg) {
        width: 20px;
        height: 20px;
    }

    h1 {
        display: flex;
        flex-direction: column;
        color: var(--color-charcoal);
        font-family: var(--font-feather);
        font-size: clamp(48px, 6.5vw, 78px);
        font-weight: 900;
        line-height: 1.02;
        letter-spacing: -0.04em;
    }

    .hero-accent {
        color: var(--color-eager-green);
    }

    .hero-description {
        max-width: 620px;
        margin: var(--spacing-20) 0 0;
        color: var(--color-pencil-gray);
        font-size: clamp(17px, 2vw, 20px);
        font-weight: 600;
        line-height: 1.5;
    }

    .download-card {
        position: relative;
        grid-column: 1 / -1;
        width: min(100%, 1040px);
        margin: 0 auto;
        padding: var(--spacing-24) clamp(20px, 3vw, 32px);
        background: color-mix(in srgb, var(--color-storybook-green) 52%, var(--surface-paper-white));
        border: 3px solid var(--color-charcoal);
        border-radius: 24px;
        box-shadow: 0 9px 0 color-mix(in srgb, var(--color-charcoal) 14%, transparent);
        overflow: hidden;
        isolation: isolate;
        transition: transform 280ms var(--motion-spring), background-color 180ms ease;
    }

    .download-card::after {
        position: absolute;
        z-index: -1;
        top: -46px;
        right: -38px;
        width: 126px;
        height: 126px;
        background: var(--color-fresh-leaf);
        border: 2px solid var(--color-charcoal);
        border-radius: 50%;
        content: "";
        opacity: 0.52;
    }

    .download-card:focus-within {
        background: color-mix(in srgb, var(--color-storybook-green) 68%, var(--surface-paper-white));
        box-shadow: 0 11px 0 color-mix(in srgb, var(--color-charcoal) 18%, transparent);
        transform: translateY(-2px);
    }

    .download-card-heading {
        display: flex;
        align-items: center;
        gap: var(--spacing-12);
        margin-bottom: var(--spacing-16);
    }

    .download-step,
    .download-icon {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border: 2px solid var(--color-charcoal);
    }

    .download-step {
        width: 38px;
        height: 38px;
        color: var(--color-paper-white);
        background: var(--color-eager-green);
        border-radius: 12px;
        font-size: 18px;
        font-weight: 900;
    }

    .download-title-group {
        display: flex;
        min-width: 0;
        flex: 1;
        flex-direction: column;
        gap: 2px;
    }

    .download-label {
        color: var(--color-charcoal);
        font-size: 16px;
        font-weight: 900;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }

    .download-hint {
        color: var(--color-pencil-gray);
        font-size: 13px;
        font-weight: 700;
        line-height: 1.3;
    }

    .download-icon {
        width: 42px;
        height: 42px;
        background: var(--surface-paper-white);
        border-radius: 50%;
    }

    .download-icon :global(svg) {
        width: 22px;
        color: var(--color-eager-green);
        stroke-width: 2.5;
    }

    .download-helper {
        margin: 0;
        color: var(--color-pencil-gray);
        font-size: var(--text-caption);
        font-weight: 700;
        line-height: 1.4;
    }

    .proof-row {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 8px 16px;
    }

    .proof-row span {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: var(--color-pencil-gray);
        font-size: 13px;
        font-weight: 800;
        text-transform: uppercase;
    }

    .proof-row :global(svg) {
        width: 17px;
        height: 17px;
        color: var(--color-eager-green);
        stroke-width: 3;
    }

    .download-card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--spacing-16);
        margin-top: var(--spacing-16);
    }

    .hero-visual {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 300px;
    }

    .mascot-stage {
        position: relative;
        display: flex;
        width: min(100%, 330px);
        aspect-ratio: 1;
        align-items: center;
        justify-content: center;
        background: var(--color-storybook-green);
        border: 2px solid var(--color-charcoal);
        border-radius: 46% 54% 52% 48% / 55% 45% 55% 45%;
        animation: stage-morph 8s ease-in-out infinite alternate;
    }

    .mascot-art {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 70%;
        animation: mascot-float 3.8s ease-in-out infinite;
    }

    .mascot-art :global(.meowbalt) {
        width: 100%;
        height: auto;
        filter: invert(1);
    }

    :global([data-theme="dark"]) .mascot-art :global(.meowbalt) {
        filter: none;
    }

    .mascot-orbit {
        position: absolute;
        border: 2px dashed var(--color-eager-green);
        border-radius: 50%;
        opacity: 0.55;
        animation: orbit-turn 18s linear infinite;
    }

    .orbit-one {
        width: 112%;
        height: 82%;
        transform: rotate(20deg);
    }

    .orbit-two {
        width: 82%;
        height: 112%;
        transform: rotate(-25deg);
        animation-direction: reverse;
    }

    .mascot-bubble {
        position: absolute;
        z-index: 2;
        display: flex;
        width: 62px;
        height: 62px;
        align-items: center;
        justify-content: center;
        color: var(--color-spark-blue);
        background: var(--surface-paper-white);
        border: 2px solid var(--color-charcoal);
        border-radius: 18px;
        font-size: 32px;
        animation: bubble-bob 3s var(--motion-spring) infinite alternate;
    }

    .youtube-bubble {
        top: 8%;
        left: -3%;
        color: #ff0033;
        transform: rotate(-8deg);
    }

    .tiktok-bubble {
        top: 20%;
        right: -5%;
        color: var(--color-night-ink);
        transform: rotate(8deg);
        animation-delay: -1s;
    }

    .instagram-bubble {
        right: 6%;
        bottom: 7%;
        color: #c13584;
        transform: rotate(-4deg);
        animation-delay: -2s;
    }

    .facebook-bubble {
        top: -6%;
        left: 44%;
        color: #1877f2;
        transform: rotate(5deg) scale(0.9);
        animation-delay: -0.5s;
    }

    :global([data-theme="dark"]) .tiktok-bubble {
        color: var(--color-charcoal);
    }

    .mascot-note {
        position: absolute;
        bottom: -18px;
        left: 10%;
        z-index: 2;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        color: var(--color-charcoal);
        background: var(--surface-paper-white);
        border: 2px solid var(--color-charcoal);
        border-radius: var(--radius-xl);
        font-size: 14px;
        font-weight: 800;
    }

    .status-dot {
        width: 10px;
        height: 10px;
        background: var(--color-eager-green);
        border-radius: 50%;
        animation: status-pulse 1.8s ease-in-out infinite;
    }

    .scroll-cue {
        display: inline-flex;
        align-items: center;
        align-self: center;
        gap: 8px;
        margin-top: var(--spacing-40);
        color: var(--color-pencil-gray);
        font-size: 13px;
        font-weight: 800;
        text-decoration: none;
        text-transform: uppercase;
    }

    .scroll-cue :global(svg) {
        width: 18px;
        animation: cue-bounce 1.7s ease-in-out infinite;
    }

    .content-section {
        padding: var(--spacing-96) 24px;
    }

    .section-heading {
        max-width: 690px;
    }

    .section-heading.centered {
        margin: 0 auto;
        text-align: center;
    }

    .section-heading h2,
    .feature-copy h2,
    .site-footer h2 {
        margin-top: var(--spacing-12);
        font-family: var(--font-feather);
        font-size: clamp(38px, 5vw, var(--text-heading));
        font-weight: 900;
        line-height: 1.12;
        letter-spacing: var(--tracking-heading);
    }

    .section-heading h2,
    .feature-copy h2 {
        color: var(--color-eager-green);
    }

    .section-heading p,
    .feature-copy > p {
        margin: var(--spacing-16) 0 0;
        color: var(--color-pencil-gray);
        font-size: var(--text-body);
        font-weight: 600;
        line-height: 1.55;
    }

    .steps-list {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--spacing-24);
        margin-top: var(--spacing-64);
    }

    .step {
        position: relative;
        display: flex;
        min-height: 250px;
        flex-direction: column;
        gap: var(--spacing-16);
        padding: var(--spacing-24);
        border: 2px solid var(--color-faded-gray);
        border-radius: 20px;
        transition: transform 300ms var(--motion-spring), border-color 180ms ease;
    }

    .step:hover {
        border-color: var(--color-eager-green);
        transform: translateY(-8px);
    }

    .step-number {
        position: absolute;
        top: var(--spacing-24);
        right: var(--spacing-24);
        color: var(--color-faded-gray);
        font-size: 13px;
        font-weight: 900;
        letter-spacing: 0.08em;
    }

    .step-icon {
        display: flex;
        width: 58px;
        height: 58px;
        align-items: center;
        justify-content: center;
        color: var(--color-charcoal);
        background: var(--color-storybook-green);
        border: 2px solid var(--color-charcoal);
        border-radius: 16px;
    }

    .step-icon :global(svg) {
        width: 29px;
        height: 29px;
        stroke-width: 2.4;
    }

    .step h3 {
        color: var(--color-charcoal);
        font-size: var(--text-subheading);
        font-weight: 900;
    }

    .step p {
        margin: 0;
        color: var(--color-pencil-gray);
        font-size: 16px;
        font-weight: 600;
        line-height: 1.5;
    }

    .split-section {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        align-items: center;
        gap: clamp(56px, 9vw, 120px);
        min-height: 680px;
    }

    .feature-copy {
        max-width: 540px;
    }

    .feature-copy ul {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-12);
        margin: var(--spacing-24) 0;
        padding: 0;
        list-style: none;
    }

    .feature-copy li {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--color-charcoal);
        font-size: 16px;
        font-weight: 800;
    }

    .feature-copy li :global(svg) {
        width: 19px;
        color: var(--color-eager-green);
        stroke-width: 3;
    }

    .outline-link,
    .primary-link {
        display: inline-flex;
        min-height: 48px;
        align-items: center;
        justify-content: center;
        padding: 0 var(--spacing-16);
        border-radius: var(--radius-buttons);
        font-size: 14px;
        font-weight: 900;
        letter-spacing: var(--tracking-nav-label);
        text-decoration: none;
        text-transform: uppercase;
        transition: transform 240ms var(--motion-spring);
    }

    .outline-link {
        color: var(--color-spark-blue);
        border: 2px solid var(--color-faded-gray);
    }

    .primary-link {
        margin-top: var(--spacing-24);
        color: var(--color-paper-white);
        background: var(--color-eager-green);
        border: 2px solid var(--color-eager-green);
    }

    .outline-link:hover,
    .primary-link:hover {
        transform: translateY(-3px);
    }

    .feature-visual {
        position: relative;
        display: flex;
        min-height: 470px;
        align-items: center;
        justify-content: center;
    }

    .privacy-visual {
        background: var(--color-storybook-green);
        border: 2px solid var(--color-charcoal);
        border-radius: 45% 55% 60% 40% / 50% 48% 52% 50%;
    }

    .privacy-ring {
        position: absolute;
        border: 2px dashed var(--color-eager-green);
        border-radius: 50%;
        animation: orbit-turn 16s linear infinite;
    }

    .ring-large {
        width: 78%;
        height: 78%;
    }

    .ring-small {
        width: 54%;
        height: 54%;
        animation-direction: reverse;
    }

    .shield-sticker {
        z-index: 1;
        display: flex;
        width: 150px;
        height: 150px;
        align-items: center;
        justify-content: center;
        color: var(--color-paper-white);
        background: var(--color-eager-green);
        border: 2px solid var(--color-charcoal);
        border-radius: 38px;
        transform: rotate(-5deg);
        animation: shield-breathe 3s ease-in-out infinite;
    }

    .shield-sticker :global(svg) {
        width: 72px;
        height: 72px;
        stroke-width: 2.2;
    }

    .privacy-ticket {
        position: absolute;
        z-index: 2;
        padding: 10px 15px;
        color: var(--color-charcoal);
        background: var(--surface-paper-white);
        border: 2px solid var(--color-charcoal);
        border-radius: var(--radius-xl);
        font-size: 14px;
        font-weight: 900;
        text-transform: uppercase;
    }

    .ticket-one {
        top: 18%;
        right: 7%;
        transform: rotate(7deg);
    }

    .ticket-two {
        bottom: 14%;
        left: 8%;
        transform: rotate(-8deg);
    }

    .format-stack {
        position: relative;
        width: min(100%, 430px);
        height: 360px;
    }

    .format-card {
        position: absolute;
        display: flex;
        width: 78%;
        min-height: 76px;
        align-items: center;
        gap: var(--spacing-16);
        padding: 0 var(--spacing-24);
        color: var(--color-charcoal);
        background: var(--surface-paper-white);
        border: 2px solid var(--color-charcoal);
        border-radius: 18px;
        font-size: 17px;
        font-weight: 900;
        transition: transform 300ms var(--motion-spring);
    }

    .format-card :global(svg) {
        width: 29px;
        height: 29px;
        color: var(--color-spark-blue);
        stroke-width: 2.2;
    }

    .format-card-0 { top: 0; left: 2%; transform: rotate(-3deg); }
    .format-card-1 { top: 90px; right: 0; transform: rotate(2deg); }
    .format-card-2 { top: 180px; left: 0; transform: rotate(-1deg); }
    .format-card-3 { top: 270px; right: 3%; transform: rotate(3deg); }

    .format-card:hover {
        z-index: 3;
        transform: translateY(-8px) rotate(0deg) scale(1.03);
    }

    .quality-section {
        border-top: 2px solid var(--border-subtle);
        border-bottom: 2px solid var(--border-subtle);
    }

    .faq-section {
        display: grid;
        grid-template-columns: 0.8fr 1.2fr;
        gap: clamp(48px, 8vw, 100px);
        align-items: start;
    }

    .faq-list {
        border-top: 2px solid var(--color-faded-gray);
    }

    details {
        border-bottom: 2px solid var(--color-faded-gray);
    }

    summary {
        position: relative;
        padding: var(--spacing-24) 44px var(--spacing-24) 0;
        color: var(--color-charcoal);
        font-size: var(--text-subheading);
        font-weight: 900;
        line-height: 1.35;
        cursor: pointer;
        list-style: none;
    }

    summary::-webkit-details-marker {
        display: none;
    }

    summary::after {
        content: "+";
        position: absolute;
        top: 50%;
        right: 8px;
        color: var(--color-spark-blue);
        font-size: 28px;
        transform: translateY(-50%);
        transition: transform 260ms var(--motion-spring);
    }

    details[open] summary::after {
        transform: translateY(-50%) rotate(45deg);
    }

    details p {
        margin: -8px 44px var(--spacing-24) 0;
        color: var(--color-pencil-gray);
        font-size: 16px;
        font-weight: 600;
        line-height: 1.6;
    }

    .site-footer {
        padding: var(--spacing-64) 24px var(--spacing-32);
        color: var(--color-paper-white);
        background: var(--color-eager-green);
    }

    .footer-inner {
        display: grid;
        grid-template-columns: 1.2fr 1fr;
        gap: var(--spacing-64);
    }

    .site-footer h2 {
        color: var(--color-paper-white);
    }

    .footer-brand p {
        color: var(--color-storybook-green);
        font-size: var(--text-body);
        font-weight: 700;
    }

    .footer-links {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--spacing-24);
    }

    .footer-links > div {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 9px;
    }

    .footer-links h3 {
        margin-bottom: 4px;
        color: var(--color-paper-white);
        font-size: 15px;
        font-weight: 900;
        letter-spacing: var(--tracking-nav-label);
        text-transform: uppercase;
    }

    .footer-links a {
        color: var(--color-storybook-green);
        font-size: 14px;
        font-weight: 800;
        text-decoration: none;
    }

    .footer-links a:hover {
        color: var(--color-paper-white);
        text-decoration: underline;
    }

    .footer-note {
        margin-top: var(--spacing-48);
        padding-top: var(--spacing-24);
        color: var(--color-storybook-green);
        border-top: 2px solid color-mix(in srgb, var(--color-paper-white) 35%, transparent);
        font-size: var(--text-caption);
        font-weight: 700;
        line-height: 1.5;
    }

    .motion-enter {
        opacity: 0;
        animation: hero-enter 700ms var(--motion-spring) forwards;
    }

    .motion-enter-1 { animation-delay: 80ms; }
    .motion-enter-2 { animation-delay: 150ms; }
    .motion-enter-3 { animation-delay: 240ms; }
    .motion-enter-4 { animation-delay: 330ms; }
    .motion-enter-5 { animation-delay: 420ms; }

    @keyframes hero-enter {
        from { opacity: 0; transform: translateY(28px) scale(0.98); }
        to { opacity: 1; transform: none; }
    }

    @keyframes mascot-float {
        0%, 100% { transform: translateY(0) rotate(-1deg); }
        50% { transform: translateY(-13px) rotate(1deg); }
    }

    @keyframes stage-morph {
        to { border-radius: 54% 46% 43% 57% / 46% 57% 43% 54%; }
    }

    @keyframes orbit-turn {
        to { rotate: 360deg; }
    }

    @keyframes bubble-bob {
        to { translate: 0 -10px; }
    }

    @keyframes status-pulse {
        50% { transform: scale(0.55); opacity: 0.5; }
    }

    @keyframes cue-bounce {
        50% { transform: translateY(5px); }
    }

    @keyframes shield-breathe {
        50% { transform: rotate(3deg) scale(1.05); }
    }

    :global([data-reduce-motion="true"]) .motion-enter {
        opacity: 1;
        animation: none;
    }

    :global([data-reduce-motion="true"]) :is(
        .mascot-stage,
        .mascot-art,
        .mascot-orbit,
        .mascot-bubble,
        .status-dot,
        .scroll-cue svg,
        .privacy-ring,
        .shield-sticker
    ) {
        animation: none;
    }

    @media screen and (max-width: 980px) {
        .hero-grid {
            grid-template-columns: 1fr;
        }

        .hero-copy {
            max-width: 760px;
            margin: 0 auto;
            text-align: center;
        }

        .hero-eyebrow {
            justify-content: center;
        }

        .hero-visual {
            display: none;
        }

        .mascot-stage {
            max-width: 390px;
        }

        .download-card {
            max-width: 760px;
        }

        .steps-list {
            grid-template-columns: 1fr;
        }

        .step {
            min-height: unset;
        }

        .split-section,
        .faq-section {
            grid-template-columns: 1fr;
        }

        .feature-copy {
            max-width: 680px;
        }

        .quality-section .format-visual {
            order: 2;
        }

        .footer-inner {
            grid-template-columns: 1fr;
        }
    }

    @media screen and (max-width: 640px) {
        .hero-section {
            min-height: auto;
            padding: var(--spacing-48) var(--spacing-16) var(--spacing-32);
        }

        h1 {
            font-size: clamp(43px, 13vw, 62px);
        }

        .download-card {
            padding: var(--spacing-16);
            border-radius: 20px;
        }

        .download-card-footer {
            align-items: flex-start;
            flex-direction: column;
        }

        .proof-row {
            justify-content: flex-start;
        }

        .download-card-heading {
            align-items: flex-start;
        }

        .download-step {
            width: 34px;
            height: 34px;
        }

        .download-icon {
            display: none;
        }

        .download-hint {
            max-width: 270px;
        }

        .proof-row {
            gap: 8px 12px;
        }

        .hero-visual {
            min-height: 340px;
        }

        .mascot-stage {
            max-width: 290px;
        }

        .mascot-bubble {
            width: 48px;
            height: 48px;
            border-radius: 14px;
            font-size: 24px;
        }

        .facebook-bubble {
            top: -7%;
            left: 42%;
        }

        .mascot-note {
            left: 4%;
            font-size: 12px;
        }

        .scroll-cue {
            display: none;
        }

        .content-section {
            padding: var(--spacing-64) var(--spacing-16);
        }

        .split-section {
            min-height: unset;
            gap: var(--spacing-48);
        }

        .feature-visual {
            min-height: 350px;
        }

        .privacy-visual {
            width: 100%;
        }

        .shield-sticker {
            width: 120px;
            height: 120px;
        }

        .format-stack {
            height: 330px;
        }

        .format-card {
            width: 82%;
            min-height: 66px;
            padding: 0 var(--spacing-16);
            font-size: 15px;
        }

        .format-card-0 { top: 0; }
        .format-card-1 { top: 82px; }
        .format-card-2 { top: 164px; }
        .format-card-3 { top: 246px; }

        .footer-links {
            grid-template-columns: repeat(2, 1fr);
        }

        .site-footer {
            padding-right: var(--spacing-16);
            padding-bottom: calc(var(--spacing-96) + var(--safe-area-inset-bottom));
            padding-left: var(--spacing-16);
        }
    }
</style>
