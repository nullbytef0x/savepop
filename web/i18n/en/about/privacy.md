<script lang="ts">
    import env from "$lib/env";
    import { t } from "$lib/i18n/translations";

    import SectionHeading from "$components/misc/SectionHeading.svelte";
</script>

<section id="privacy-scope">
<SectionHeading
    title={$t("about.heading.privacy_scope")}
    sectionId="privacy-scope"
/>

SavePop does not require an account or profile. The web interface does not build a download history or use your links for advertising.

Downloads are handled by the processing instance shown in your settings. If you select a third-party instance, its operator controls that server and may follow a different privacy policy.
</section>

<section id="browser-data">
<SectionHeading
    title={$t("about.heading.browser_data")}
    sectionId="browser-data"
/>

Your theme, format choices, accessibility preferences, and processing-instance settings are saved locally in your browser. They are not synchronized to a SavePop account.

Temporary browser storage may be used while combining, converting, or remuxing media. SavePop removes working files after processing, and you can clear locally stored app data from [privacy settings](/settings/privacy).
</section>

<section id="request-data">
<SectionHeading
    title={$t("about.heading.request_data")}
    sectionId="request-data"
/>

To complete a download, the active processing instance receives:

<ul>
<li>the public URL you submit;</li>
<li>format, quality, subtitle, and metadata options needed for the request;</li>
<li>ordinary network information required for an internet connection, such as your IP address and request headers.</li>
</ul>

SavePop does not ask for your name, email address, social-media password, or payment information. Never paste private credentials into the download field.
</section>

<section id="processing">
<SectionHeading
    title={$t("about.heading.processing")}
    sectionId="processing"
/>

Whenever possible, merging and conversion happen locally in your browser. This keeps working media on your device and reduces server processing.

When server assistance is necessary, media is fetched and streamed for the active request. Some operations require short-lived encrypted tunnel information in server memory. Retention and logging outside the standard SavePop server depend on the instance operator you selected.
</section>

{#if env.PLAUSIBLE_ENABLED}
<section id="analytics">
<SectionHeading
    title={$t("about.heading.analytics")}
    sectionId="analytics"
/>

This deployment uses Plausible to measure aggregate page traffic. Plausible does not use advertising cookies, and download URLs are not included in analytics events.

You can disable analytics in [privacy settings](/settings/privacy#analytics). When disabled, the analytics script is not loaded.
</section>
{/if}

<section id="third-parties">
<SectionHeading
    title={$t("about.heading.third_parties")}
    sectionId="third-parties"
/>

A download can involve the source platform, the selected processing instance, your internet provider, and the provider hosting this website. Those parties process network data under their own policies.

SavePop is not affiliated with supported social platforms. Avoid downloading sensitive material through an instance you do not trust.
</section>
