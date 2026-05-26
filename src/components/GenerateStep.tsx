import { useEffect, useMemo, useRef, useState } from "react";
import { useZine } from "@/lib/store";
import { buildZine, type ZineDoc, type ZinePage } from "@/lib/zine";
import { ChevronLeft, ChevronRight, Play, Pause, Volume2 } from "lucide-react";

const MESSAGES = [
  "folding the pages…",
  "cutting along the dotted line…",
  "stapling the spine…",
  "pressing play…",
  "adding the grain…",
  "setting the type…",
  "trimming the bleed…",
  "warming the press…",
];

export function GenerateStep() {
  const { setStep, setGenerated, setTheme, ...state } = useZine();
  const [loading, setLoading] = useState(true);
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    setTheme("light"); // auto-switch to light when preview loads
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % MESSAGES.length), 700);
    const done = setTimeout(() => {
      setLoading(false);
      setGenerated(true);
      clearInterval(t);
    }, 2800);
    return () => {
      clearInterval(t);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doc = useMemo(
    () =>
      buildZine({
        title: state.title,
        format: state.format,
        vibe: state.vibe,
        photos: state.photos,
        videos: state.videos,
        audios: state.audios,
        words: state.words,
      }),
    [state.title, state.format, state.vibe, state.photos, state.videos, state.audios, state.words]
  );

  if (loading) {
    return (
      <div className="grid min-h-[calc(100vh-130px)] place-items-center bg-card p-10">
        <div className="text-center">
          <div className="relative mx-auto mb-8 h-16 w-16">
            <div className="spin-slow absolute inset-0 rounded-full border border-dashed border-ink/30" />
            <div className="absolute inset-2 rounded-full bg-[color:var(--accent-red)]/10" />
          </div>
          <div className="font-display text-2xl italic text-ink flicker">{MESSAGES[msgIdx]}</div>
          <div className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-light">
            generating your {state.format.replace("-", " ")}
          </div>
        </div>
      </div>
    );
  }

  return <Preview doc={doc} onExport={() => setStep(4)} />;
}

function Preview({ doc, onExport }: { doc: ZineDoc; onExport: () => void }) {
  const { format, headerFont, bodyFont, vibe, textShape, igRatio } = useZine();
  const [pageIdx, setPageIdx] = useState(0);
  const page = doc.pages[pageIdx];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);

  const isSpread = format === "two-page";
  const isInstagram = format === "instagram";

  // Aspect for current preview
  const aspect = useMemo(() => {
    if (isSpread) return "16/10";
    if (isInstagram) return igRatio === "1:1" ? "1" : igRatio === "4:5" ? "4/5" : "9/16";
    if (format === "single-sheet") return "11/8.5";
    return "5/7";
  }, [format, igRatio, isSpread, isInstagram]);

  // Audio autoplay on page change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setAudioPlaying(false);
    }
    if (page?.audio) {
      const a = new Audio(page.audio.url);
      audioRef.current = a;
      a.play().then(() => setAudioPlaying(true)).catch(() => setAudioPlaying(false));
      a.onended = () => setAudioPlaying(false);
    }
    return () => {
      audioRef.current?.pause();
    };
  }, [pageIdx, page?.audio]);

  const next = () => setPageIdx((i) => Math.min(i + 1, doc.pages.length - 1));
  const prev = () => setPageIdx((i) => Math.max(i - 1, 0));

  return (
    <div className="grid gap-0 md:grid-cols-[1fr_320px] min-h-[calc(100vh-130px)]">
      <div className="flex flex-col items-center justify-center gap-6 bg-paper-deep/40 p-6 md:p-10">
        <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-mid">
          <button onClick={prev} disabled={pageIdx === 0} className="grid h-8 w-8 place-items-center border border-rule disabled:opacity-30">
            <ChevronLeft size={14} />
          </button>
          <span>
            {pageIdx + 1} / {doc.pages.length} · {page.label}
          </span>
          <button onClick={next} disabled={pageIdx === doc.pages.length - 1} className="grid h-8 w-8 place-items-center border border-rule disabled:opacity-30">
            <ChevronRight size={14} />
          </button>
        </div>

        <div
          className="relative w-full max-w-[480px] bg-paper shadow-[0_30px_60px_-30px_rgba(0,0,0,0.35)]"
          style={{ aspectRatio: aspect }}
        >
          {isSpread ? (
            <div className="absolute inset-0 grid grid-cols-2">
              <ZinePageView page={doc.pages[0]} headerFont={headerFont} bodyFont={bodyFont} vibe={vibe} shape={textShape} side="left" />
              <ZinePageView page={doc.pages[1]} headerFont={headerFont} bodyFont={bodyFont} vibe={vibe} shape={textShape} side="right" />
            </div>
          ) : (
            <ZinePageView page={page} headerFont={headerFont} bodyFont={bodyFont} vibe={vibe} shape={textShape} />
          )}
          {/* Watermark for free tier */}
          <div className="absolute bottom-1.5 right-2 font-mono text-[7px] tracking-[0.1em] text-ink-light/70">
            made with paperslice.app
          </div>
        </div>

        {page?.audio && (
          <button
            onClick={() => {
              if (!audioRef.current) return;
              if (audioPlaying) {
                audioRef.current.pause();
                setAudioPlaying(false);
              } else {
                audioRef.current.play();
                setAudioPlaying(true);
              }
            }}
            className="flex items-center gap-2 border border-rule bg-card px-3 py-1.5 font-mono text-[10px] tracking-[0.1em] text-ink-mid"
          >
            {audioPlaying ? <Pause size={11} /> : <Play size={11} fill="currentColor" />}
            <Volume2 size={11} /> {page.audio.name}
          </button>
        )}

        <div className="flex flex-wrap items-center justify-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-light">
          <span className="border border-rule bg-card px-2 py-0.5">{vibe}</span>
          <span className="border border-rule bg-card px-2 py-0.5">{textShape}</span>
          <span className="border border-rule bg-card px-2 py-0.5">{format.replace("-", " ")}</span>
          {format === "instagram" && <span className="border border-rule bg-card px-2 py-0.5">{igRatio}</span>}
        </div>
      </div>

      <aside className="bg-paper-warm p-6 md:p-7">
        <div className="label-xs mb-4">Pages</div>
        <div className="grid grid-cols-4 gap-1 mb-6 max-h-72 overflow-y-auto">
          {doc.pages.map((p, i) => (
            <button
              key={i}
              onClick={() => setPageIdx(i)}
              className={`relative aspect-[3/4] overflow-hidden border ${
                i === pageIdx ? "border-[color:var(--accent-red)]" : "border-rule"
              }`}
              title={p.label}
            >
              {p.photo ? (
                <img src={p.photo.url} alt="" className="h-full w-full object-cover opacity-80" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-card font-mono text-[7px] text-ink-light">{p.label}</div>
              )}
              <span className="absolute bottom-0 left-0 right-0 bg-ink/60 px-1 py-[1px] font-mono text-[7px] text-[color:var(--paper)]">
                {i + 1}
              </span>
            </button>
          ))}
        </div>

        {(format === "single-sheet" || format === "printable-zine" || format === "two-page") && (
          <p className="mb-5 border-l-2 border-[color:var(--accent-red)] bg-card px-3 py-2 font-serif text-[11px] italic text-ink-mid">
            Audio & video play in digital preview only — print formats are silent.
          </p>
        )}

        <button
          onClick={onExport}
          className="w-full bg-ink py-3.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--paper)] transition hover:bg-[color:var(--accent-red)]"
        >
          Export →
        </button>
      </aside>
    </div>
  );
}

function ZinePageView({
  page,
  headerFont,
  bodyFont,
  vibe,
  shape,
  side,
}: {
  page: ZinePage;
  headerFont: string;
  bodyFont: string;
  vibe: string;
  shape: string;
  side?: "left" | "right";
}) {
  const vibeBg =
    vibe === "minimal"
      ? "bg-paper"
      : vibe === "editorial"
      ? "bg-[color:var(--paper-warm)]"
      : vibe === "typewriter"
      ? "bg-[color:var(--paper)]"
      : vibe === "collage"
      ? "bg-paper-deep"
      : "bg-paper";

  const overlay =
    vibe === "grain"
      ? "after:absolute after:inset-0 after:opacity-40 after:mix-blend-multiply after:bg-[radial-gradient(circle_at_30%_20%,_transparent_0,_rgba(0,0,0,0.06)_100%)]"
      : vibe === "collage"
      ? "after:absolute after:inset-2 after:border after:border-dashed after:border-ink/20"
      : "";

  const headingClass =
    shape === "diagonal"
      ? "rotate-[-6deg]"
      : shape === "stacked"
      ? "flex flex-col leading-[0.85]"
      : shape === "scattered"
      ? "rotate-[3deg]"
      : "";

  const headingStyle: React.CSSProperties = {
    fontFamily: headerFont,
    fontStyle: vibe === "editorial" ? "italic" : "normal",
    fontWeight: vibe === "minimal" ? 400 : 700,
  };
  if (shape === "outlined") {
    (headingStyle as any).WebkitTextStroke = "1px currentColor";
    headingStyle.color = "transparent";
  }

  return (
    <div className={`relative h-full w-full overflow-hidden ${vibeBg} ${overlay}`}>
      {page.photo && page.kind !== "back" && (
        <img
          src={page.photo.url}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover ${page.kind === "cover" ? "opacity-80" : "opacity-70"}`}
          style={{
            filter: vibe === "grain" ? "contrast(1.05) saturate(0.9)" : vibe === "collage" ? "grayscale(0.4) contrast(1.1)" : "none",
          }}
        />
      )}

      {page.video && (
        <video src={page.video.url} className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline />
      )}

      {/* Tape strip on cover for collage vibe */}
      {vibe === "collage" && page.kind === "cover" && (
        <div className="tape absolute -top-1 left-1/4 h-5 w-16 rotate-[-4deg]" />
      )}

      <div className={`absolute inset-0 flex flex-col ${page.kind === "cover" ? "justify-end" : "justify-start"} p-4 ${side === "right" ? "pl-3" : ""}`}>
        {page.heading && (
          <h3
            className={`${headingClass} drop-shadow-[0_1px_0_var(--paper)] ${
              page.kind === "cover" ? "text-[26px]" : "text-[14px]"
            } leading-[1.05] text-ink`}
            style={headingStyle}
          >
            {shape === "stacked" && page.heading
              ? page.heading.split(/\s+/).slice(0, 4).map((w, i) => (
                  <span key={i}>{w}</span>
                ))
              : page.heading}
          </h3>
        )}
        {page.body && page.kind !== "cover" && (
          <p
            className={`mt-2 text-[10px] leading-[1.55] text-ink-mid ${
              shape === "scattered" ? "rotate-[-2deg]" : ""
            }`}
            style={{
              fontFamily: bodyFont,
              fontStyle: vibe === "editorial" ? "italic" : "normal",
            }}
          >
            {page.body.slice(0, 240)}
            {page.body.length > 240 ? "…" : ""}
          </p>
        )}
        {page.kind === "cover" && (
          <div className="mt-2 font-mono text-[8px] uppercase tracking-[0.2em] text-ink-light">a paperslice zine</div>
        )}
        {page.kind === "back" && (
          <div className="m-auto text-center font-mono text-[8px] uppercase tracking-[0.2em] text-ink-light">
            paperslice.app
          </div>
        )}
      </div>
    </div>
  );
}
