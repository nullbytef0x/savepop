<script>
    import { t } from "$lib/i18n/translations";
    import IconX from "@tabler/icons-svelte/IconX.svelte";

    export let click;
</script>

<button
    id="clear-button"
    class="button"
    on:click={click}
    aria-label={$t("a11y.save.clear_input")}
>
    <IconX />
</button>

<style>
    #clear-button {
        width: 34px;
        min-width: 34px;
        min-height: 34px;
        padding: 6px;
        background: color-mix(in srgb, var(--color-faded-gray) 16%, transparent);
        border: 2px solid var(--color-faded-gray);
        border-radius: 100%;
    }

    #clear-button :global(svg) {
        width: 17px;
        height: 17px;
        stroke-width: 2px;
        stroke: var(--secondary);
        will-change: transform;
    }
</style>
