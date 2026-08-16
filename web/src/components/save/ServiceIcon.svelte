<script lang="ts">
    import IconBrandBilibili from "@tabler/icons-svelte/IconBrandBilibili.svelte";
    import IconBrandBluesky from "@tabler/icons-svelte/IconBrandBluesky.svelte";
    import IconBrandFacebook from "@tabler/icons-svelte/IconBrandFacebook.svelte";
    import IconBrandInstagram from "@tabler/icons-svelte/IconBrandInstagram.svelte";
    import IconBrandPinterest from "@tabler/icons-svelte/IconBrandPinterest.svelte";
    import IconBrandReddit from "@tabler/icons-svelte/IconBrandReddit.svelte";
    import IconBrandSnapchat from "@tabler/icons-svelte/IconBrandSnapchat.svelte";
    import IconBrandSoundcloud from "@tabler/icons-svelte/IconBrandSoundcloud.svelte";
    import IconBrandTiktok from "@tabler/icons-svelte/IconBrandTiktok.svelte";
    import IconBrandTumblr from "@tabler/icons-svelte/IconBrandTumblr.svelte";
    import IconBrandTwitch from "@tabler/icons-svelte/IconBrandTwitch.svelte";
    import IconBrandVimeo from "@tabler/icons-svelte/IconBrandVimeo.svelte";
    import IconBrandVk from "@tabler/icons-svelte/IconBrandVk.svelte";
    import IconBrandX from "@tabler/icons-svelte/IconBrandX.svelte";
    import IconBrandYoutube from "@tabler/icons-svelte/IconBrandYoutube.svelte";
    import IconDeviceGamepad2 from "@tabler/icons-svelte/IconDeviceGamepad2.svelte";
    import IconMovie from "@tabler/icons-svelte/IconMovie.svelte";
    import IconPlayerPlay from "@tabler/icons-svelte/IconPlayerPlay.svelte";
    import IconVideo from "@tabler/icons-svelte/IconVideo.svelte";
    import IconWorld from "@tabler/icons-svelte/IconWorld.svelte";

    export let name: string;

    const icons: Record<string, ConstructorOfATypedSvelteComponent> = {
        bilibili: IconBrandBilibili,
        bluesky: IconBrandBluesky,
        bsky: IconBrandBluesky,
        facebook: IconBrandFacebook,
        instagram: IconBrandInstagram,
        pinterest: IconBrandPinterest,
        reddit: IconBrandReddit,
        snapchat: IconBrandSnapchat,
        soundcloud: IconBrandSoundcloud,
        tiktok: IconBrandTiktok,
        tumblr: IconBrandTumblr,
        twitch: IconBrandTwitch,
        "twitch clips": IconBrandTwitch,
        twitter: IconBrandX,
        x: IconBrandX,
        vimeo: IconBrandVimeo,
        vk: IconBrandVk,
        youtube: IconBrandYoutube,
        dailymotion: IconPlayerPlay,
        loom: IconVideo,
        newgrounds: IconDeviceGamepad2,
        "ok.ru": IconWorld,
        ok: IconWorld,
        rutube: IconMovie,
        streamable: IconPlayerPlay,
    };

    $: Icon = icons[name.toLowerCase()] || IconWorld;
</script>

<span class="service-icon" aria-hidden="true">
    <svelte:component this={Icon} />
</span>

<style>
    .service-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
    }

    .service-icon :global(svg) {
        width: 1em;
        height: 1em;
        stroke-width: 2.2;
    }
</style>
