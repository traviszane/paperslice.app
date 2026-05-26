import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, X } from "lucide-react";
import { toast } from "sonner";
import { trimAndCompress, formatDuration } from "@/lib/ffmpeg";

interface Props {
  file: File;
  onCancel: () => void;
  onDone: (result: { blob: Blob; url: string; duration: number; name: string }) => void;
}

const TARGET_BYTES = 8 * 1024 * 1024;
const SOFT_MAX = 30;
const THUMB_COUNT = 10;

export function VideoTrimmer({ file, onCancel, onDone }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src] = useState(() => URL.createObjectURL(file));
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => () => URL.revokeObjectURL(src), [src]);

  // generate thumbnails by drawing seeked frames to a canvas
  const generateThumbs = useCallback(async (dur: number) => {
    const out: string[] = [];
    const v = document.createElement("video");
    v.preload = "auto";
    v.muted = true;
    v.src = src;
    await new Promise<void>((r) => v.addEventListener("loadedmetadata", () => r(), { once: true }));
    const w = 80;
    const h = Math.round((v.videoHeight / v.videoWidth) * w) || 50;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    for (let i = 0; i < THUMB_COUNT; i++) {
      const t = (dur * i) / THUMB_COUNT;
      v.currentTime = t;
      await new Promise<void>((r) => v.addEventListener("seeked", () => r(), { once: true }));
      ctx.drawImage(v, 0, 0, w, h);
      out.push(canvas.toDataURL("image/jpeg", 0.6));
    }
    setThumbs(out);
  }, [src]);

  const onLoadedMetadata = () => {
    const d = videoRef.current?.duration ?? 0;
    setDuration(d);
    setEnd(d);
    generateThumbs(d).catch(() => {});
  };

  // Loop playback within [start, end]
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      setCurrentTime(v.currentTime);
      if (v.currentTime >= end) {
        v.currentTime = start;
        if (!playing) v.pause();
      }
      if (v.currentTime < start) v.currentTime = start;
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [start, end, playing]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (v.currentTime < start || v.currentTime >= end) v.currentTime = start;
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const selectedDuration = Math.max(0, end - start);
  const overLimit = selectedDuration > SOFT_MAX;

  const handleConfirm = async () => {
    if (selectedDuration < 0.5) return toast.error("Selection too short");
    setProcessing(true);
    setProgress(0);
    try {
      const blob = await trimAndCompress(file, {
        start, end,
        targetBytes: TARGET_BYTES,
        onProgress: (p) => setProgress(p),
      });
      if (blob.size > TARGET_BYTES * 1.1) {
        toast.warning(`Output is ${(blob.size / 1024 / 1024).toFixed(1)}MB — slightly over 8MB target.`);
      } else {
        toast.success(`Compressed to ${(blob.size / 1024 / 1024).toFixed(1)}MB`);
      }
      const url = URL.createObjectURL(blob);
      onDone({ blob, url, duration: selectedDuration, name: file.name.replace(/\.[^.]+$/, "") + ".mp4" });
    } catch (e) {
      toast.error(`Trim failed: ${(e as Error).message}`);
      setProcessing(false);
    }
  };

  // Drag handles
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"start" | "end" | null>(null);
  const onPointerDown = (which: "start" | "end") => (e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = which;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !trackRef.current || !duration) return;
    const r = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const t = pct * duration;
    if (dragging.current === "start") setStart(Math.min(t, end - 0.5));
    else setEnd(Math.max(t, start + 0.5));
  };
  const onPointerUp = () => { dragging.current = null; };

  const pct = (t: number) => (duration ? (t / duration) * 100 : 0);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4 backdrop-blur-sm">
      <div className="grain w-full max-w-[640px] border border-rule bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-rule px-5 py-3">
          <div className="label-xs">Trim video · target 8MB · max 30s</div>
          <button onClick={onCancel} disabled={processing} className="text-ink-mid hover:text-ink disabled:opacity-40">
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          <div className="relative aspect-video overflow-hidden bg-ink">
            <video
              ref={videoRef}
              src={src}
              onLoadedMetadata={onLoadedMetadata}
              onEnded={() => setPlaying(false)}
              className="h-full w-full object-contain"
              playsInline
            />
            <button
              onClick={togglePlay}
              className="absolute inset-0 grid place-items-center bg-ink/0 transition hover:bg-ink/20"
              aria-label="Play selection"
            >
              {!playing && (
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[color:var(--cotton)]/90 text-ink">
                  <Play size={18} fill="currentColor" />
                </span>
              )}
              {playing && (
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[color:var(--cotton)]/90 text-ink opacity-0 hover:opacity-100">
                  <Pause size={18} fill="currentColor" />
                </span>
              )}
            </button>
          </div>

          {/* Timeline */}
          <div className="mt-5">
            <div
              ref={trackRef}
              className="relative h-14 select-none border border-rule bg-paper-warm"
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              {/* thumbnails */}
              <div className="absolute inset-0 flex">
                {thumbs.length > 0
                  ? thumbs.map((t, i) => (
                      <img key={i} src={t} alt="" className="h-full flex-1 object-cover opacity-80" draggable={false} />
                    ))
                  : Array.from({ length: THUMB_COUNT }).map((_, i) => (
                      <div key={i} className="h-full flex-1 border-r border-rule/30 bg-paper-deep" />
                    ))}
              </div>

              {/* dim areas outside selection */}
              <div className="pointer-events-none absolute inset-y-0 left-0 bg-ink/55" style={{ width: `${pct(start)}%` }} />
              <div className="pointer-events-none absolute inset-y-0 right-0 bg-ink/55" style={{ width: `${100 - pct(end)}%` }} />

              {/* selection frame */}
              <div
                className="pointer-events-none absolute inset-y-0 border-y-2 border-[color:var(--accent-red)]"
                style={{ left: `${pct(start)}%`, right: `${100 - pct(end)}%` }}
              />

              {/* playhead */}
              <div
                className="pointer-events-none absolute top-0 h-full w-0.5 bg-[color:var(--cotton)] mix-blend-difference"
                style={{ left: `${pct(currentTime)}%` }}
              />

              {/* start handle */}
              <button
                onPointerDown={onPointerDown("start")}
                className="absolute top-0 z-10 -ml-2 h-full w-4 cursor-ew-resize touch-none bg-[color:var(--accent-red)]"
                style={{ left: `${pct(start)}%` }}
                aria-label="Start handle"
              >
                <span className="absolute left-1/2 top-1/2 h-5 w-[1.5px] -translate-x-1/2 -translate-y-1/2 bg-[color:var(--cotton)]" />
              </button>
              {/* end handle */}
              <button
                onPointerDown={onPointerDown("end")}
                className="absolute top-0 z-10 -ml-2 h-full w-4 cursor-ew-resize touch-none bg-[color:var(--accent-red)]"
                style={{ left: `${pct(end)}%` }}
                aria-label="End handle"
              >
                <span className="absolute left-1/2 top-1/2 h-5 w-[1.5px] -translate-x-1/2 -translate-y-1/2 bg-[color:var(--cotton)]" />
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-ink-mid">
              <span>{formatDuration(start)}</span>
              <span className={overLimit ? "text-[color:var(--accent-red)]" : ""}>
                {formatDuration(selectedDuration)} / {formatDuration(SOFT_MAX)}
              </span>
              <span>{formatDuration(end)}</span>
            </div>
            {overLimit && (
              <p className="mt-2 font-serif text-[12px] italic text-[color:var(--accent-red)]">
                Over 30s — output will be larger and may exceed 8MB. You can still proceed.
              </p>
            )}
          </div>

          {processing && (
            <div className="mt-5 border border-rule bg-paper-warm p-4">
              <div className="label-xs mb-2 flicker">compressing…</div>
              <div className="h-1.5 w-full overflow-hidden bg-paper-deep">
                <div className="h-full bg-[color:var(--accent-red)] transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-1 font-mono text-[10px] text-ink-light">{progress}%</div>
            </div>
          )}

          <div className="mt-5 flex gap-2">
            <button
              onClick={onCancel}
              disabled={processing}
              className="flex-1 border border-rule px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-paper-warm disabled:opacity-40"
            >
              cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={processing || selectedDuration < 0.5}
              className="flex-[2] bg-ink px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--paper)] hover:bg-[color:var(--accent-red)] disabled:opacity-40"
            >
              {processing ? "compressing…" : `trim & compress (${formatDuration(selectedDuration)})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
