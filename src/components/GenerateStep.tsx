import { useEffect, useMemo, useRef, useState } from "react";
import { useZine } from "@/lib/store";
import { buildZine, type ZineDoc } from "@/lib/zine";
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

/* ===== Artful headline that respects textShape ===== */
function ArtfulHeading({
  text,
  shape,
  font,
  size = 26,
  color = "var(--ink)",
  italic = false,
  weight = 700,
}: {
  text: string;
  shape: string;
  font: string;
  size?: number;
  color?: string;
  italic?: boolean;
  weight?: number;
}) {
  const baseStyle: React.CSSProperties = {
    fontFamily: font,
    fontStyle: italic ? "italic" : "normal",
    fontWeight: weight,
    color,
    lineHeight: 1.0,
  };

  if (shape === "wavy") {
    // Render each character on a sine wave
    const chars = text.split("");
    return (
      <h3 className="flex flex-wrap" style={{ ...baseStyle, fontSize: size, gap: "0.04em" }}>
        {chars.map((c, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `translateY(${Math.sin(i * 0.7) * (size * 0.18)}px) rotate(${Math.sin(i * 0.7) * 6}deg)`,
            }}
          >
            {c === " " ? "\u00A0" : c}
          </span>
        ))}
      </h3>
    );
  }

  if (shape === "arc" || shape === "circle") {
    // SVG textPath along an arc/circle
    const width = 320;
    const height = shape === "circle" ? 200 : 110;
    const pathD =
      shape === "circle"
        ? `M ${width / 2 - 80},${height / 2} a 80,80 0 1,1 160,0 a 80,80 0 1,1 -160,0`
        : `M 10,${height - 10} Q ${width / 2},10 ${width - 10},${height - 10}`;
    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ overflow: "visible" }}>
        <defs>
          <path id={`arc-${text.length}-${shape}`} d={pathD} fill="none" />
        </defs>
        <text fill={color} style={{ ...baseStyle, fontSize: size * 0.75 }}>
          <textPath href={`#arc-${text.length}-${shape}`} startOffset="50%" textAnchor="middle">
            {text}
          </textPath>
        </text>
      </svg>
    );
  }

  if (shape === "stacked") {
    return (
      <h3 className="flex flex-col" style={{ ...baseStyle, fontSize: size, lineHeight: 0.85 }}>
        {text.split(/\s+/).slice(0, 5).map((w, i) => (
          <span key={i} style={{ marginLeft: i % 2 ? "0.3em" : 0 }}>{w}</span>
        ))}
      </h3>
    );
  }

  if (shape === "scattered") {
    const words = text.split(/\s+/);
    return (
      <h3 style={{ ...baseStyle, fontSize: size }} className="flex flex-wrap gap-x-1.5">
        {words.map((w, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `rotate(${[-4, 3, -2, 5, -3][i % 5]}deg) translateY(${[0, -2, 3, -1, 2][i % 5]}px)`,
            }}
          >
            {w}
          </span>
        ))}
      </h3>
    );
  }

  if (shape === "diagonal") {
    return <h3 style={{ ...baseStyle, fontSize: size, transform: "rotate(-6deg)", transformOrigin: "left bottom" }}>{text}</h3>;
  }

  if (shape === "outlined") {
    return (
      <h3
        style={{
          ...baseStyle,
          fontSize: size,
          color: "transparent",
          WebkitTextStroke: `1.2px ${color}`,
        }}
      >
        {text}
      </h3>
    );
  }

  return <h3 style={{ ...baseStyle, fontSize: size }}>{text}</h3>;
}

function tokenToBg(token?: string): string {
  if (!token) return "var(--paper)";
  return `var(--${token})`;
}

function ZinePageView({
  page,
  headerFont,
  bodyFont,
  vibe,
  shape,
  side,
}: {
  page: import("@/lib/zine").ZinePage;
  headerFont: string;
  bodyFont: string;
  vibe: string;
  shape: string;
  side?: "left" | "right";
}) {
  const bg = tokenToBg(page.bgToken);
  const isDarkBg = page.bgToken === "clay" || page.bgToken === "ink";
  const ink = isDarkBg ? "var(--cotton)" : "var(--ink)";
  const inkMid = isDarkBg ? "color-mix(in oklab, var(--cotton) 80%, transparent)" : "var(--ink-mid)";

  const grainOverlay =
    vibe === "grain"
      ? "after:absolute after:inset-0 after:opacity-30 after:mix-blend-multiply after:pointer-events-none after:[background-image:radial-gradient(circle_at_30%_20%,_transparent_0,_rgba(0,0,0,0.08)_100%)]"
      : "";

  // Render layouts
  const renderContent = () => {
    switch (page.layout) {
      case "cover":
        return (
          <div className="absolute inset-0 flex flex-col">
            {page.photo && (
              <div className="relative flex-1 overflow-hidden m-4 mb-3">
                <img src={page.photo.url} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="px-5 pb-5">
              <ArtfulHeading
                text={page.heading || "Untitled"}
                shape={shape}
                font={headerFont}
                size={32}
                color={ink}
                italic={vibe === "editorial"}
                weight={vibe === "minimal" ? 400 : 700}
              />
              <div className="mt-2 font-mono text-[8px] uppercase tracking-[0.22em]" style={{ color: inkMid }}>
                a paperslice zine
              </div>
            </div>
          </div>
        );

      case "back":
        return (
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="font-display text-2xl italic" style={{ color: ink }}>fin.</div>
              <div className="mt-2 font-mono text-[8px] uppercase tracking-[0.22em]" style={{ color: inkMid }}>
                paperslice.app
              </div>
            </div>
          </div>
        );

      case "photo-bleed":
        return (
          <>
            {page.photo && (
              <img src={page.photo.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
          </>
        );

      case "photo-card":
        return (
          <div className="absolute inset-0 flex flex-col p-5">
            {page.photo && (
              <div className="relative aspect-[4/5] overflow-hidden mb-3 shadow-[0_4px_12px_-6px_rgba(0,0,0,0.25)]">
                <img src={page.photo.url} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            {page.body && (
              <p
                className="text-[9.5px] leading-[1.55]"
                style={{ fontFamily: bodyFont, color: inkMid, fontStyle: vibe === "editorial" ? "italic" : "normal" }}
              >
                {page.body.slice(0, 160)}{page.body.length > 160 ? "…" : ""}
              </p>
            )}
          </div>
        );

      case "photo-polaroid":
        return (
          <div className="absolute inset-0 grid place-items-center p-6">
            <div className="relative rotate-[-3deg] bg-[color:var(--cotton)] p-2 pb-8 shadow-[0_8px_18px_-8px_rgba(0,0,0,0.35)]">
              <div className="tape absolute -top-2 left-1/2 h-4 w-12 -translate-x-1/2 rotate-[2deg]" />
              {page.photo && (
                <div className="aspect-square w-44 overflow-hidden">
                  <img src={page.photo.url} alt="" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="mt-1 text-center font-mono text-[8px] uppercase tracking-[0.18em] text-[color:var(--ink-mid)]">
                {page.heading || page.label}
              </div>
            </div>
          </div>
        );

      case "photo-duo":
        return (
          <div className="absolute inset-0 grid grid-rows-2 gap-2 p-4">
            {page.photo && (
              <div className="relative overflow-hidden">
                <img src={page.photo.url} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            {page.photoB && (
              <div className="relative overflow-hidden ml-6">
                <img src={page.photoB.url} alt="" className="h-full w-full object-cover" />
              </div>
            )}
          </div>
        );

      case "text-only":
        return (
          <div className="absolute inset-0 flex flex-col justify-center p-7">
            {page.heading && (
              <ArtfulHeading
                text={page.heading}
                shape={shape}
                font={headerFont}
                size={22}
                color={ink}
                italic={vibe === "editorial"}
                weight={vibe === "minimal" ? 400 : 700}
              />
            )}
            {page.body && (
              <p
                className="mt-3 text-[11px] leading-[1.7]"
                style={{ fontFamily: bodyFont, color: inkMid, fontStyle: vibe === "editorial" ? "italic" : "normal" }}
              >
                {page.body.slice(0, 280)}{page.body.length > 280 ? "…" : ""}
              </p>
            )}
          </div>
        );

      case "text-pullquote":
        return (
          <div className="absolute inset-0 flex flex-col justify-center p-7">
            <div className="mb-2 font-mono text-[8px] uppercase tracking-[0.22em]" style={{ color: inkMid }}>—</div>
            <p
              className="font-display text-[18px] italic leading-[1.3]"
              style={{ color: ink }}
            >
              "{(page.body || "").slice(0, 120)}{(page.body || "").length > 120 ? "…" : ""}"
            </p>
          </div>
        );

      case "video":
        return (
          <>
            {page.video && (
              <video src={page.video.url} className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline />
            )}
          </>
        );

      case "empty":
      default:
        return (
          <div className="absolute inset-0 grid place-items-center">
            <span className="font-mono text-[8px] uppercase tracking-[0.3em]" style={{ color: inkMid }}>
              {page.label}
            </span>
          </div>
        );
    }
  };

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${grainOverlay} ${side === "right" ? "border-l border-rule" : ""}`}
      style={{ background: bg }}
    >
      {renderContent()}
    </div>
  );
}
