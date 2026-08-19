<script lang="ts">
    import { t } from "$lib/i18n/translations";
    import SectionHeading from "$components/misc/SectionHeading.svelte";
</script>

<section id="terms-scope">
<SectionHeading
    title={$t("about.heading.terms_scope")}
    sectionId="terms-scope"
/>

By using SavePop, you agree to use it lawfully and only for content you are permitted to save. These guidelines apply to this SavePop interface; independently operated processing instances may publish additional terms.
</section>

<section id="allowed-use">
<SectionHeading
    title={$t("about.heading.allowed_use")}
    sectionId="allowed-use"
/>

SavePop is intended for freely accessible public media. Appropriate uses may include saving your own uploads, licensed material, public-domain works, backups allowed by a platform, or content for which the rights holder has granted permission.

Educational or commentary use does not automatically make every download lawful. Applicable copyright exceptions differ by country and context.
</section>

<section id="content-rights">
<SectionHeading
    title={$t("about.heading.content_rights")}
    sectionId="content-rights"
/>

Creators and platforms retain their rights in the original media. Downloading a file does not transfer ownership or permission to republish, sell, impersonate, or remove attribution.

Check the source platform's terms, the creator's license, and local law before saving or redistributing content. When sharing permitted material, preserve credit and source information where appropriate.
</section>

<section id="prohibited-use">
<SectionHeading
    title={$t("about.heading.prohibited_use")}
    sectionId="prohibited-use"
/>

Do not use SavePop to:

<ul>
<li>access private, paid, or DRM-protected content without authorization;</li>
<li>infringe copyright, privacy, publicity, or other legal rights;</li>
<li>distribute malware, abusive material, or deceptive copies;</li>
<li>overload, scrape, or automate requests in a way that harms the service or source platforms;</li>
<li>bypass access controls or use another person's credentials.</li>
</ul>
</section>

<section id="availability">
<SectionHeading
    title={$t("about.heading.availability")}
    sectionId="availability"
/>

SavePop is provided on a best-effort basis. Supported platforms may change without notice, and a link can fail because content was removed, restricted, rate-limited, or delivered in an unsupported format.

There is no guarantee that every link, quality, codec, subtitle, or metadata field will be available. Service features may be changed or suspended to address reliability, safety, or legal concerns.
</section>

<section id="liability">
<SectionHeading
    title={$t("about.heading.liability")}
    sectionId="liability"
/>

You are responsible for the links you submit, the files you save, and how you use or distribute them. SavePop does not review or endorse downloaded content and is provided without warranties to the extent permitted by law.

Keep backups of important files and verify downloaded content before opening or sharing it.
</section>
