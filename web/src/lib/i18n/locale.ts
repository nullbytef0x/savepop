import { derived } from 'svelte/store';

import settings from '$lib/state/settings';
import { INTERNAL_locale, defaultLocale } from '$lib/i18n/translations';

export default derived(
    settings,
    () => {
        INTERNAL_locale.set(defaultLocale);
        return defaultLocale;
    }
);
