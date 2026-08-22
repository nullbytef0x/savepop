import proxy from "./proxy.js";
import ffmpeg from "./ffmpeg.js";

import { closeResponse } from "./shared.js";
import { internalStream } from "./internal.js";

const errorMessage = error => [error?.message, error?.cause?.message]
    .filter(Boolean)
    .join(": ") || String(error);

export default async function(res, streamInfo) {
    try {
        switch (streamInfo.type) {
            case "proxy":
                return await proxy(streamInfo, res);

            case "internal":
                return await internalStream(streamInfo.data, res);

            case "merge":
            case "remux":
            case "mute":
                return await ffmpeg.remux(streamInfo, res);

            case "audio":
                return await ffmpeg.convertAudio(streamInfo, res);

            case "gif":
                return await ffmpeg.convertGif(streamInfo, res);
        }

        closeResponse(res);
    } catch (error) {
        console.error(
            `[stream] ${streamInfo?.service || "unknown"}/${streamInfo?.type || "unknown"} failed: ${errorMessage(error)}`
        );
        closeResponse(res);
    }
}
