<a id="cobalt-logo" href="/" aria-label="SavePop home">
    <span class="logo-mark" aria-hidden="true">
        <span class="logo-letter">S</span>
        <span class="pop-dot pop-dot-one"></span>
        <span class="pop-dot pop-dot-two"></span>
    </span>
    <span class="wordmark">SavePop</span>
</a>

<style>
    #cobalt-logo {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        gap: 10px;
        padding: 0 var(--spacing-16);
        color: var(--color-charcoal);
        text-decoration: none;
    }

    .logo-mark {
        display: flex;
        position: relative;
        width: 40px;
        height: 40px;
        align-items: center;
        justify-content: center;
        background: var(--color-eager-green);
        border: 2px solid var(--color-charcoal);
        border-radius: 12px;
        transition: transform 260ms var(--motion-spring);
    }

    #cobalt-logo:hover .logo-mark {
        transform: rotate(-6deg) scale(1.06);
    }

    .logo-letter {
        color: var(--color-paper-white);
        font-family: var(--font-feather);
        font-size: 24px;
        font-weight: 900;
        line-height: 1;
    }

    .pop-dot {
        position: absolute;
        display: block;
        border: 2px solid var(--color-charcoal);
        border-radius: 999px;
    }

    .pop-dot-one {
        top: -5px;
        right: -4px;
        width: 11px;
        height: 11px;
        background: var(--color-spark-blue);
    }

    .pop-dot-two {
        top: 7px;
        right: -8px;
        width: 7px;
        height: 7px;
        background: var(--color-storybook-green);
    }

    .wordmark {
        font-family: var(--font-feather);
        font-size: 24px;
        font-weight: 900;
        letter-spacing: -0.04em;
    }

    @media screen and (max-width: 535px) {
        #cobalt-logo {
            display: none;
        }
    }
</style>
