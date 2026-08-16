<script lang="ts">
    import settings from "$lib/state/settings";

    import { device } from "$lib/device";
    import { themeOptions } from "$lib/types/settings";
    import { t } from "$lib/i18n/translations";

    import Switcher from "$components/buttons/Switcher.svelte";
    import SettingsButton from "$components/buttons/SettingsButton.svelte";
    import SettingsToggle from "$components/buttons/SettingsToggle.svelte";
    import SettingsCategory from "$components/settings/SettingsCategory.svelte";
</script>

<SettingsCategory sectionId="theme" title={$t("settings.theme")}>
    <Switcher big={true} description={$t("settings.theme.description")}>
        {#each themeOptions as value}
            <SettingsButton
                settingContext="appearance"
                settingId="theme"
                settingValue={value}
            >
                {$t(`settings.theme.${value}`)}
            </SettingsButton>
        {/each}
    </Switcher>
</SettingsCategory>

{#if device.is.mobile}
    <SettingsCategory sectionId="tabs" title={$t("settings.tabs")}>
        <SettingsToggle
            settingContext="appearance"
            settingId="hideRemuxTab"
            title={$t("settings.tabs.hide_remux")}
            description={$t("settings.tabs.hide_remux.description")}
        />
    </SettingsCategory>
{/if}
