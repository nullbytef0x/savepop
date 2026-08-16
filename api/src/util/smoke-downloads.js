import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiURL = new URL(process.env.SMOKE_API_URL || "http://localhost:9000/");
const sampleSize = Number(process.env.SMOKE_SAMPLE_BYTES || 64 * 1024);
const testDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "tests");

const advertisedNames = {
    bsky: "bluesky",
    twitch: "twitch clips",
};

const requestDefaults = {
    downloadMode: "auto",
    videoQuality: "144",
    audioFormat: "best",
    audioBitrate: "128",
    filenameStyle: "basic",
    youtubeVideoCodec: "h264",
    youtubeVideoContainer: "auto",
    youtubeDubLang: "original",
    subtitleLang: "none",
    localProcessing: "disabled",
    alwaysProxy: true,
};

const scoreFixture = (fixture) => {
    const text = `${fixture.name} ${fixture.url}`.toLowerCase();
    let score = fixture.expected?.code === 200 ? 20 : -100;

    if (/video|reel|clip|short/.test(text)) score += 10;
    if (fixture.expected?.status === "tunnel") score += 5;
    if (Object.keys(fixture.params || {}).length === 0) score += 3;
    if (/audio|mute|photo|image|gif|picker|private|inexistent|unavailable|long/.test(text)) score -= 20;

    return score;
};

const isPrimaryMediaFixture = fixture => {
    const text = `${fixture.name} ${fixture.url}`.toLowerCase();
    return !/audio|mute|photo|picture|image|gif|private|mature|inexistent|unavailable|long/.test(text);
};

const postSaveRequest = async (fixture) => {
    const response = await fetch(apiURL, {
        method: "POST",
        headers: {
            accept: "application/json",
            "content-type": "application/json",
        },
        body: JSON.stringify({
            ...requestDefaults,
            ...fixture.params,
            url: fixture.url,
            downloadMode: "auto",
            videoQuality: fixture.params?.videoQuality || "144",
            localProcessing: "disabled",
            alwaysProxy: true,
        }),
        signal: AbortSignal.timeout(30_000),
    });

    const body = await response.json();
    if (!response.ok || body.status === "error") {
        throw new Error(body.error?.code || `api http ${response.status}`);
    }

    return body;
};

const mediaTargets = (response) => {
    if (["redirect", "tunnel"].includes(response.status)) {
        return [response.url];
    }

    if (response.status === "local-processing") {
        return response.tunnel || [];
    }

    if (response.status === "picker") {
        const items = [...(response.picker || [])].sort(
            (a, b) => Number(b.type === "video") - Number(a.type === "video")
        );
        return items[0]?.url ? [items[0].url] : [];
    }

    return [];
};

const readMediaSample = async (url) => {
    const response = await fetch(url, {
        headers: { range: `bytes=0-${sampleSize - 1}` },
        redirect: "follow",
        signal: AbortSignal.timeout(45_000),
    });

    if (!response.ok) throw new Error(`media http ${response.status}`);

    const contentType = response.headers.get("content-type") || "unknown";
    if (/text\/html|application\/json/i.test(contentType)) {
        throw new Error(`unexpected ${contentType}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("empty response body");

    let received = 0;
    while (received < sampleSize) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
    }
    await reader.cancel().catch(() => {});

    if (received === 0) throw new Error("zero media bytes");
    return { contentType, received };
};

const serverInfo = await fetch(apiURL, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
}).then(response => response.json());

const advertised = new Set(
    (serverInfo.cobalt?.services || []).map(service => service.toLowerCase())
);
const fixtureFiles = (await readdir(testDir))
    .filter(file => file.endsWith(".json"))
    .sort();

const results = [];

for (const fixtureFile of fixtureFiles) {
    const service = path.basename(fixtureFile, ".json");
    const advertisedName = advertisedNames[service] || service;
    if (!advertised.has(advertisedName)) continue;

    let fixtures = JSON.parse(await readFile(path.join(testDir, fixtureFile), "utf8"))
        .filter(fixture => fixture.expected?.code === 200);

    // The audit is specifically for downloadable media. If a service has video
    // fixtures, do not let a working image/GIF hide broken video extraction.
    const mediaFixtures = fixtures.filter(isPrimaryMediaFixture);
    if (mediaFixtures.length && service !== "soundcloud") fixtures = mediaFixtures;
    fixtures.sort((a, b) => scoreFixture(b) - scoreFixture(a));

    const failures = [];
    let success;

    for (const fixture of fixtures) {
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const saveResponse = await postSaveRequest(fixture);
                const targets = mediaTargets(saveResponse);
                if (!targets.length) throw new Error(`no media target (${saveResponse.status})`);

                const samples = [];
                for (const target of targets) samples.push(await readMediaSample(target));

                success = {
                    fixture: fixture.name,
                    response: saveResponse.status,
                    bytes: samples.reduce((sum, sample) => sum + sample.received, 0),
                    types: [...new Set(samples.map(sample => sample.contentType))].join(", "),
                };
                break;
            } catch (error) {
                if (attempt === 2) failures.push(`${fixture.name}: ${error.message}`);
            }
        }
        if (success) break;
    }

    results.push({ service: advertisedName, success, failures });
    if (success) {
        console.log(
            `PASS  ${advertisedName.padEnd(14)} ${String(success.bytes).padStart(7)} B  ${success.types}  (${success.fixture})`
        );
    } else {
        console.log(`FAIL  ${advertisedName.padEnd(14)} ${failures.at(-1) || "no public fixture"}`);
    }
}

const tested = new Set(results.map(result => result.service));
for (const service of advertised) {
    if (!tested.has(service)) {
        results.push({ service, failures: ["no fixture file"] });
        console.log(`FAIL  ${service.padEnd(14)} no fixture file`);
    }
}

const passed = results.filter(result => result.success).length;
const failed = results.length - passed;
console.log(`\n${passed}/${results.length} platforms passed; ${failed} failed`);

if (failed) {
    console.log("\nFailure details:");
    for (const result of results.filter(result => !result.success)) {
        console.log(`\n${result.service}:`);
        for (const failure of result.failures) console.log(`  - ${failure}`);
    }
    process.exitCode = 1;
}
