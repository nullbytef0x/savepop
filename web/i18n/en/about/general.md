<script lang="ts">
    import { t } from "$lib/i18n/translations";

    import SectionHeading from "$components/misc/SectionHeading.svelte";
</script>

<section id="purpose">
<SectionHeading
    title={$t("about.heading.purpose")}
    sectionId="purpose"
/>

SavePop is a straightforward media downloader for public links. Paste a link from a supported platform, choose the result you want, and save it to your device.

It can handle video, audio, photos, clips, subtitles, and metadata when the source platform makes them available. There are no accounts, advertising pop-ups, or paid download tiers in the SavePop interface.
</section>

<section id="workflow">
<SectionHeading
    title={$t("about.heading.workflow")}
    sectionId="workflow"
/>

When you submit a link, SavePop sends the link and your selected options to the active processing instance. That instance finds the available media streams and returns the best matching result.

Some platforms provide video and audio separately. When your browser supports it, SavePop combines those streams directly on your device. Other results are streamed through the processing instance without becoming a permanent file on that server.

Source availability, quality, and speed can change because each supported platform controls its own media delivery.
</section>

<section id="formats">
<SectionHeading
    title={$t("about.heading.formats")}
    sectionId="formats"
/>

**Auto** chooses a sensible video result. **Audio** saves or converts the audio track. **Mute** creates a video without sound.

Additional controls in [settings](/settings) let you choose quality, codecs, containers, audio formats, filenames, subtitles, and metadata. A requested option may be unavailable when the original post does not provide a compatible source.
</section>

<section id="principles">
<SectionHeading
    title={$t("about.heading.principles")}
    sectionId="principles"
/>

SavePop is designed to be quick to understand, comfortable on mobile and desktop, and respectful of your attention. The interface avoids deceptive buttons, forced registrations, behavioral advertising, and artificial download limits.

Accessibility preferences and download settings stay on your device so the experience remains consistent without requiring a profile.
</section>
