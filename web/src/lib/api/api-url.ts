import env from "$lib/env";
import { browser } from "$app/environment";
import { get } from "svelte/store";
import settings from "$lib/state/settings";

const normalizeApiURL = (value: string) => {
    const base = browser ? window.location.origin : "http://localhost";
    return new URL(value, base).href.replace(/\/+$/, "");
}

export const currentApiURL = () => {
    const processingSettings = get(settings).processing;
    const customInstanceURL = processingSettings.customInstanceURL;

    if (processingSettings.enableCustomInstances && customInstanceURL.length > 0) {
        return normalizeApiURL(customInstanceURL);
    }

    return normalizeApiURL(env.DEFAULT_API!);
}
