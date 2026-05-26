// Lazy-loaded FFmpeg.wasm helper. Browser-only.
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let _ffmpeg: FFmpeg | null = null;
let _loading: Promise<FFmpeg> | null = null;

export async function getFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (_ffmpeg) return _ffmpeg;
  if (_loading) return _loading;
  _loading = (async () => {
    const ff = new FFmpeg();
    if (onLog) ff.on("log", ({ message }) => onLog(message));
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await ff.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    _ffmpeg = ff;
    return ff;
  })();
  return _loading;
}

export interface TrimCompressOptions {
  start: number;        // seconds
  end: number;          // seconds
  targetBytes?: number; // default 8 MB
  onProgress?: (pct: number) => void;
}

/** Trim + re-encode to mp4 (h264/aac) targeting ~targetBytes. */
export async function trimAndCompress(
  file: File | Blob,
  opts: TrimCompressOptions,
): Promise<Blob> {
  const ff = await getFFmpeg();
  const targetBytes = opts.targetBytes ?? 8 * 1024 * 1024;
  const duration = Math.max(0.1, opts.end - opts.start);
  // bit budget: target * 8 / duration, reserve ~96kbps for audio
  const totalKbps = Math.floor((targetBytes * 8) / 1000 / duration);
  const audioKbps = 96;
  const videoKbps = Math.max(200, totalKbps - audioKbps);

  const inputName = "in.mp4";
  const outputName = "out.mp4";
  await ff.writeFile(inputName, await fetchFile(file));

  if (opts.onProgress) {
    ff.on("progress", ({ progress }) => opts.onProgress!(Math.min(100, Math.round(progress * 100))));
  }

  await ff.exec([
    "-ss", String(opts.start),
    "-t",  String(duration),
    "-i", inputName,
    "-vf", "scale='min(1080,iw)':-2",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-b:v", `${videoKbps}k`,
    "-maxrate", `${videoKbps}k`,
    "-bufsize", `${videoKbps * 2}k`,
    "-c:a", "aac",
    "-b:a", `${audioKbps}k`,
    "-movflags", "+faststart",
    "-y", outputName,
  ]);

  const data = await ff.readFile(outputName);
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);
  const buf = (data as Uint8Array).slice().buffer as ArrayBuffer;
  return new Blob([buf], { type: "video/mp4" });
}

/** Strip audio from a video file and return mp3 blob. */
export async function extractAudioFromVideo(
  file: File | Blob,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const ff = await getFFmpeg();
  const inputName = "vin.mp4";
  const outputName = "vout.mp3";
  await ff.writeFile(inputName, await fetchFile(file));
  if (onProgress) ff.on("progress", ({ progress }) => onProgress(Math.min(100, Math.round(progress * 100))));
  await ff.exec([
    "-i", inputName,
    "-vn",
    "-c:a", "libmp3lame",
    "-b:a", "128k",
    "-y", outputName,
  ]);
  const data = await ff.readFile(outputName);
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);
  const buf = (data as Uint8Array).slice().buffer as ArrayBuffer;
  return new Blob([buf], { type: "audio/mpeg" });
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
