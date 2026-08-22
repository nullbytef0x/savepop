import ffmpeg from "ffmpeg-static";
import { spawn } from "child_process";
import { create as contentDisposition } from "content-disposition-header";

import { env } from "../config.js";
import { destroyInternalStream } from "./manage.js";
import { hlsExceptions } from "../processing/service-config.js";
import { closeResponse, pipe, estimateTunnelLength, estimateAudioMultiplier } from "./shared.js";
import { spawnYtDlpFormat } from "../processing/services/youtube.js";

const metadataTags = new Set([
    "album",
    "composer",
    "genre",
    "copyright",
    "title",
    "artist",
    "album_artist",
    "track",
    "date",
    "sublanguage"
]);

const convertMetadataToFFmpeg = (metadata) => {
    const args = [];

    for (const [ name, value ] of Object.entries(metadata)) {
        if (metadataTags.has(name)) {
            if (name === "sublanguage") {
                args.push('-metadata:s:s:0', `language=${value}`);
                continue;
            }
            args.push('-metadata', `${name}=${value.replace(/[\u0000-\u0009]/g, '')}`); // skipcq: JS-0004
        } else {
            throw `${name} metadata tag is not supported.`;
        }
    }

    return args;
}

const killProcess = (p) => {
    p?.kill('SIGTERM'); // ask the process to terminate itself gracefully

    setTimeout(() => {
        if (p?.exitCode === null)
            p?.kill('SIGKILL'); // brutally murder the process if it didn't quit
    }, 5000);
}

const getCommand = (args) => {
    if (typeof env.processingPriority === 'number' && !isNaN(env.processingPriority)) {
        return ['nice', ['-n', env.processingPriority.toString(), ffmpeg, ...args]]
    }
    return [ffmpeg, args]
}

const render = async (res, streamInfo, ffargs, estimateMultiplier, inputDownloaders = []) => {
    let process;
    let stopped = false;
    const urls = Array.isArray(streamInfo.urls) ? streamInfo.urls : [streamInfo.urls];
    const shutdown = () => {
        if (stopped) return;
        stopped = true;
        killProcess(process);
        inputDownloaders.forEach(input => {
            killProcess(input.process);
            input.cleanup();
        });
        closeResponse(res);
        urls.map(destroyInternalStream);
    };

    try {
        const args = [
            '-loglevel', '-8',
            ...ffargs,
        ];

        process = spawn(...getCommand(args), {
            windowsHide: true,
            stdio: [
                'inherit', 'inherit', 'inherit',
                'pipe',
                ...inputDownloaders.map(() => 'pipe'),
            ],
        });

        const [,,, muxOutput] = process.stdio;

        inputDownloaders.forEach((input, index) => {
            const ffmpegInput = process.stdio[index + 4];
            input.stream.on('error', shutdown);
            ffmpegInput.on('error', shutdown);
            input.process.on('error', shutdown);
            input.process.on('close', code => {
                if (code && !stopped) {
                    console.error(
                        `[youtube/yt-dlp] format download failed (${code}): ${input.error() || "unknown error"}`
                    );
                    shutdown();
                }
            });
            input.stream.pipe(ffmpegInput);
        });

        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Content-Disposition', contentDisposition(streamInfo.filename));

        const estimatedLength = Number(streamInfo.estimatedSize)
            || await estimateTunnelLength(streamInfo, estimateMultiplier);
        if (estimatedLength > 0) {
            res.setHeader('Estimated-Content-Length', Math.floor(estimatedLength));
        }
        res.flushHeaders?.();

        pipe(muxOutput, res, shutdown);

        process.on('close', shutdown);
        res.on('finish', shutdown);
    } catch (error) {
        console.error(`[stream/ffmpeg] failed: ${error?.message || String(error)}`);
        shutdown();
    }
}

const prepareYoutubeInputs = async (streamInfo, formatIds) => {
    const downloaders = [];

    try {
        for (const formatId of formatIds) {
            downloaders.push(await spawnYtDlpFormat(streamInfo.originalRequest?.id, formatId));
        }
        return downloaders;
    } catch (error) {
        downloaders.forEach(input => {
            killProcess(input.process);
            input.cleanup();
        });
        throw error;
    }
};

const remux = async (streamInfo, res) => {
    const format = streamInfo.filename.split('.').pop();
    const urls = Array.isArray(streamInfo.urls) ? streamInfo.urls : [streamInfo.urls];
    let inputs = urls;
    let inputDownloaders = [];

    // if the stream type is merge, we expect two URLs
    if (streamInfo.type === 'merge' && urls.length !== 2) {
        return closeResponse(res);
    }

    // yt-dlp's downloader retries CDN and DNS failures that commonly abort
    // direct googlevideo streams in Node/FFmpeg. Pipe exact selected formats
    // into FFmpeg so output starts without first buffering an entire video.
    if (streamInfo.service === 'youtube') {
        const formatIds = urls.length === 2
            ? [
                streamInfo.originalRequest?.formatIds?.video,
                streamInfo.originalRequest?.formatIds?.audio,
            ]
            : [streamInfo.originalRequest?.formatIds?.video];
        inputDownloaders = await prepareYoutubeInputs(streamInfo, formatIds);
        inputs = inputDownloaders.map((_, index) => `pipe:${index + 4}`);
    }

    const args = inputs.flatMap(url => ['-i', url]);

    if (streamInfo.subtitles) {
        args.push(
            '-i', streamInfo.subtitles,
            '-map', `${urls.length}:s`,
            '-c:s', format === 'mp4' ? 'mov_text' : 'webvtt',
        );
    }

    if (urls.length === 2) {
        args.push(
            '-map', '0:v',
            '-map', '1:a',
        );
    } else if (streamInfo.type === 'mute') {
        // Adaptive YouTube video tracks contain no audio stream. Mapping audio
        // before applying `-an` makes FFmpeg exit without producing a file.
        args.push('-map', '0:v:0');
    } else {
        args.push(
            '-map', '0:v:0',
            '-map', '0:a:0'
        );
    }

    args.push(
        '-c:v', 'copy',
        ...(streamInfo.type === 'mute' ? ['-an'] : ['-c:a', 'copy'])
    );

    if (format === 'mp4') {
        args.push('-movflags', 'faststart+frag_keyframe+empty_moov');
    }

    if (streamInfo.type !== 'mute' && streamInfo.isHLS && hlsExceptions.has(streamInfo.service)) {
        if (streamInfo.service === 'youtube' && format === 'webm') {
            args.push('-c:a', 'libopus');
        } else {
            args.push('-c:a', 'aac', '-bsf:a', 'aac_adtstoasc');
        }
    }

    if (streamInfo.metadata) {
        args.push(...convertMetadataToFFmpeg(streamInfo.metadata));
    }

    args.push('-f', format === 'mkv' ? 'matroska' : format, 'pipe:3');

    await render(res, streamInfo, args, undefined, inputDownloaders);
}

const convertAudio = async (streamInfo, res) => {
    let input = streamInfo.urls;
    let inputDownloaders = [];

    if (streamInfo.service === 'youtube') {
        inputDownloaders = await prepareYoutubeInputs(
            streamInfo,
            [streamInfo.originalRequest?.formatIds?.audio],
        );
        input = 'pipe:4';
    }

    const args = [
        '-i', input,
        '-vn',
        ...(streamInfo.audioCopy ? ['-c:a', 'copy'] : ['-b:a', `${streamInfo.audioBitrate}k`]),
    ];

    if (streamInfo.audioFormat === 'mp3' && streamInfo.audioBitrate === '8') {
        args.push('-ar', '12000');
    }

    if (streamInfo.audioFormat === 'opus') {
        args.push('-vbr', 'off');
    }

    if (streamInfo.audioFormat === 'mp4a') {
        args.push('-movflags', 'frag_keyframe+empty_moov');
    }

    if (streamInfo.metadata) {
        args.push(...convertMetadataToFFmpeg(streamInfo.metadata));
    }

    args.push(
        '-f',
        streamInfo.audioFormat === 'm4a' ? 'ipod' : streamInfo.audioFormat,
        'pipe:3',
    );

    await render(
        res,
        streamInfo,
        args,
        estimateAudioMultiplier(streamInfo) * 1.1,
        inputDownloaders,
    );
}

const convertGif = async (streamInfo, res) => {
    const args = [
        '-i', streamInfo.urls,

        '-vf',
        'scale=-1:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
        '-loop', '0',

        '-f', 'gif', 'pipe:3',
    ];

    await render(
        res,
        streamInfo,
        args,
        60,
    );
}

export default {
    remux,
    convertAudio,
    convertGif,
}
