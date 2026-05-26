import { useState } from "react";
import { toast } from "sonner";
import { Plus, Play, Trash2, FileText, Music, X } from "lucide-react";
import { useZine } from "@/lib/store";
import { Dropzone } from "./Dropzone";
import { VideoTrimmer } from "./VideoTrimmer";
import { extractAudioFromVideo } from "@/lib/ffmpeg";

type Tab = "photos" | "video" | "words" | "audio";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

const uid = () => Math.random().toString(36).slice(2, 10);

export function UploadStep() {
  const [tab, setTab] = useState<Tab>("photos");
  const [trimmerFile, setTrimmerFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const {
    title,
    setTitle,
    photos,
    addPhotos,
    removePhoto,
    clearPhotos,
    videos,
    addVideos,
    removeVideo,
    clearVideos,
    setVideoPage,
    words,
    setWords,
    clearWords,
    audios,
    addAudios,
    removeAudio,
    clearAudios,
    setAudioPage,
    setStep,
  } = useZine();

  const handlePhotos = (files: File[]) => {
    const valid = files.filter((f) => /^image\/(jpeg|png|webp|jpg)$/.test(f.type));
    if (valid.length < files.length) toast.warning("Some files were skipped (jpg/png/webp only)");
    const remaining = 20 - photos.length;
    if (valid.length > remaining) toast.warning(`Free tier: 20 photos max. Added first ${remaining}.`);
    addPhotos(
      valid.slice(0, remaining).map((f) => ({
        id: uid(),
        name: f.name,
        url: URL.createObjectURL(f),
        size: f.size,
      }))
    );
  };

  const handleVideos = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    if (!/^video\/(mp4|quicktime|webm)$/.test(f.type)) {
      toast.warning(`Skipped ${f.name} — mp4/mov/webm only`);
      return;
    }
    if (videos.length >= 3) {
      toast.warning("Free tier: 3 videos max.");
      return;
    }
    setTrimmerFile(f);
  };

  const handleTrimmerDone = (r: { blob: Blob; url: string; duration: number; name: string }) => {
    addVideos([{ id: uid(), name: r.name, url: r.url, size: r.blob.size, duration: r.duration }]);
    setTrimmerFile(null);
  };

  const handleAudios = async (files: File[]) => {
    const valid: { name: string; blob: Blob }[] = [];
    for (const f of files) {
      // Accept mp4: extract audio track
      if (/^video\/mp4$/.test(f.type) || f.name.toLowerCase().endsWith(".mp4")) {
        if (audios.length + valid.length >= 3) break;
        try {
          setExtracting(true);
          toast.info(`Extracting audio from ${f.name}…`);
          const audioBlob = await extractAudioFromVideo(f);
          valid.push({ name: f.name.replace(/\.mp4$/i, ".mp3"), blob: audioBlob });
        } catch (e) {
          toast.error(`Couldn't extract audio: ${(e as Error).message}`);
        } finally {
          setExtracting(false);
        }
        continue;
      }
      if (!/audio\/(mpeg|mp3|wav|x-wav)/.test(f.type)) {
        toast.warning(`Skipped ${f.name} — mp3/wav/mp4 only`);
        continue;
      }
      if (f.size > MAX_AUDIO_BYTES) {
        toast.error(`${f.name} exceeds 10MB`);
        continue;
      }
      valid.push({ name: f.name, blob: f });
    }
    const remaining = 3 - audios.length;
    addAudios(
      valid.slice(0, remaining).map((v) => ({ id: uid(), name: v.name, url: URL.createObjectURL(v.blob), size: v.blob.size }))
    );
  };




  const handleWordsFile = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    if (!f.name.endsWith(".txt")) return toast.error("Only .txt files");
    f.text().then((t) => setWords(words ? `${words}\n\n${t}` : t));
  };

  const hasAny = photos.length || videos.length || words.trim() || audios.length;

  return (
    <div className="grid gap-0 md:grid-cols-[1fr_320px] min-h-[calc(100vh-130px)]">
      <div className="border-b border-rule bg-card p-6 md:border-b-0 md:border-r md:p-10">
        {/* Title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled Zine"
          className="mb-6 w-full bg-transparent font-display text-3xl font-bold text-ink outline-none placeholder:text-ink-light md:text-4xl"
        />

        {/* Tabs */}
        <div className="mb-7 flex gap-7 border-b border-rule">
          {(["photos", "video", "words", "audio"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`label-xs -mb-px border-b pb-3 ${
                tab === t ? "border-ink text-ink" : "border-transparent hover:text-ink-mid"
              }`}
            >
              {t}{" "}
              <span className="ml-1 text-[9px] text-ink-light">
                {t === "photos" && photos.length ? `${photos.length}/20` : ""}
                {t === "video" && videos.length ? `${videos.length}/3` : ""}
                {t === "audio" && audios.length ? `${audios.length}/3` : ""}
              </span>
            </button>
          ))}
        </div>

        {tab === "photos" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="label-xs">Your photos · drag in jpg, png, webp</div>
              {photos.length > 0 && (
                <button onClick={clearPhotos} className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-light hover:text-[color:var(--accent-red)]">
                  clear all
                </button>
              )}
            </div>
            {photos.length === 0 ? (
              <Dropzone
                onFiles={handlePhotos}
                accept="image/jpeg,image/png,image/webp"
                className="grid aspect-[3/2] place-items-center border border-dashed border-rule bg-paper/40 text-center"
              >
                <div>
                  <Plus className="mx-auto mb-2 text-ink-light" size={20} />
                  <div className="label-xs">drop photos or click to browse</div>
                  <div className="mt-2 font-mono text-[9px] text-ink-light">up to 20 · free tier</div>
                </div>
              </Dropzone>
            ) : (
              <div className="grid grid-cols-3 gap-1.5 md:grid-cols-5">
                {photos.map((p) => (
                  <div key={p.id} className="group relative aspect-square overflow-hidden bg-paper-deep">
                    <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
                    <button
                      onClick={() => removePhoto(p.id)}
                      className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-ink/80 text-[color:var(--paper)] opacity-0 transition group-hover:opacity-100"
                      aria-label="Remove"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                {photos.length < 20 && (
                  <Dropzone
                    onFiles={handlePhotos}
                    accept="image/jpeg,image/png,image/webp"
                    className="grid aspect-square place-items-center border border-dashed border-rule text-ink-light hover:bg-paper-warm"
                  >
                    <Plus size={18} />
                  </Dropzone>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "video" && (
          <div>
            <div className="label-xs mb-4">Your video · mp4, mov, webm · trim + compress to 8MB (FFmpeg coming next)</div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              {videos.map((v) => (
                <div key={v.id} className="group relative aspect-video overflow-hidden bg-ink">
                  <video src={v.url} className="h-full w-full object-cover" muted playsInline />
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <Play className="text-[color:var(--paper)]/50" size={22} fill="currentColor" />
                  </div>
                  <input
                    type="number"
                    min={1}
                    placeholder="p."
                    value={v.page ?? ""}
                    onChange={(e) => setVideoPage(v.id, e.target.value ? Number(e.target.value) : undefined)}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-1 left-1 w-12 rounded-sm bg-ink/70 px-1.5 py-0.5 font-mono text-[10px] text-[color:var(--paper)] outline-none"
                  />
                  <button
                    onClick={() => removeVideo(v.id)}
                    className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-ink/80 text-[color:var(--paper)] opacity-0 transition group-hover:opacity-100"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              {videos.length < 3 && (
                <Dropzone
                  onFiles={handleVideos}
                  accept="video/mp4,video/quicktime,video/webm"
                  className="grid aspect-video place-items-center border border-dashed border-rule text-center"
                >
                  <div>
                    <Plus className="mx-auto mb-1 text-ink-light" size={16} />
                    <div className="label-xs">add video</div>
                  </div>
                </Dropzone>
              )}
            </div>
            <p className="mt-3 font-mono text-[9px] text-ink-light">
              Videos play in digital preview & e-book. Print formats are silent.
            </p>
          </div>
        )}

        {tab === "words" && (
          <div>
            <div className="label-xs mb-4">Your words · paste, type, or drop a .txt</div>
            <Dropzone onFiles={handleWordsFile} accept="text/plain" multiple={false} className="">
              <textarea
                value={words}
                onChange={(e) => setWords(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="We took the long way down Insurgentes, stopping wherever the light looked right. There's something about a city that doesn't try to make itself legible…"
                className="font-serif w-full resize-none border-b border-rule bg-transparent pb-4 text-[17px] italic leading-[1.85] text-ink-mid outline-none placeholder:text-ink-light/70"
                rows={9}
              />
            </Dropzone>
            <div className="mt-2 flex items-center gap-2 font-mono text-[9px] text-ink-light">
              <FileText size={11} /> {words.length} chars · drop a .txt anywhere in this box to append
            </div>
          </div>
        )}

        {tab === "audio" && (
          <div>
            <div className="label-xs mb-4">Your audio · mp3, wav · max 10MB · plays at assigned page</div>
            {audios.map((a) => (
              <div key={a.id} className="flex items-center gap-3 border-b border-rule py-3">
                <button
                  onClick={() => {
                    const audio = new Audio(a.url);
                    audio.play();
                  }}
                  className="grid h-7 w-7 place-items-center border border-rule text-ink-mid hover:bg-paper-warm"
                >
                  <Play size={10} fill="currentColor" />
                </button>
                <Music size={12} className="text-ink-light" />
                <div className="flex-1 truncate font-mono text-[11px] text-ink-mid">{a.name}</div>
                <input
                  type="number"
                  min={1}
                  placeholder="p."
                  value={a.page ?? ""}
                  onChange={(e) => setAudioPage(a.id, e.target.value ? Number(e.target.value) : undefined)}
                  className="w-14 border border-rule bg-transparent px-2 py-1 font-mono text-[10px] text-ink outline-none"
                />
                <button onClick={() => removeAudio(a.id)} className="text-ink-light hover:text-[color:var(--accent-red)]">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {audios.length < 3 && (
              <Dropzone onFiles={handleAudios} accept="audio/mpeg,audio/wav,audio/mp3,video/mp4" className="mt-3">
                <div className="flex items-center gap-2 border border-dashed border-rule px-3 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-light hover:bg-paper-warm">
                  <Plus size={12} /> add audio file
                </div>
              </Dropzone>
            )}
          </div>
        )}
      </div>

      {/* Right rail */}
      <aside className="bg-paper-warm p-6 md:p-7">
        <div className="label-xs mb-4">Summary</div>
        <div className="space-y-2.5 border-b border-rule pb-5 font-mono text-[11px] text-ink-mid">
          <Row label="Title" value={title || "—"} />
          <Row label="Photos" value={`${photos.length} / 20`} />
          <Row label="Videos" value={`${videos.length} / 3`} />
          <Row label="Audio" value={`${audios.length} / 3`} />
          <Row label="Words" value={`${words.trim().split(/\s+/).filter(Boolean).length} words`} />
        </div>

        <div className="mt-6 space-y-2.5">
          <div className="label-xs">Tips</div>
          <p className="font-serif text-[12px] italic leading-[1.7] text-ink-mid">
            A zine is a love letter to a moment. Don't overthink it — pick the photos that hum, write what you'd
            scribble on a napkin, leave room for grain.
          </p>
        </div>

        <button
          disabled={!hasAny}
          onClick={() => setStep(2)}
          className="mt-8 w-full bg-ink py-3.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--paper)] transition hover:bg-[color:var(--accent-red)] disabled:cursor-not-allowed disabled:bg-paper-deep disabled:text-ink-light"
        >
          Continue to format →
        </button>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-ink-light">{label}</span>
      <span className="truncate text-ink">{value}</span>
    </div>
  );
}
