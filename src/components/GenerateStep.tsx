import { useEffect, useMemo, useRef, useState } from "react";
import { useZine, type SpacingMode } from "@/lib/store";
import { buildZine, type ZineDoc, type ZinePage } from "@/lib/zine";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  Trash2,
  RefreshCw,
  Plus,
  X,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  Shuffle,
  Maximize2,
  Image as ImageIcon,
  Move,
} from "lucide-react";

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

const BG_TOKENS: { id: string; label: string }[] = [
  { id: "paper", label: "Paper" },
  { id: "paper-warm", label: "Warm" },
  { id: "paper-deep", label: "Deep" },
  { id: "cotton", label: "Cotton" },
  { id: "clay", label: "Clay" },
  { id: "sage", label: "Sage" },
  { id: "sky", label: "Sky" },
  { id: "blush", label: "Blush" },
  { id: "lavender", label: "Lavender" },
  { id: "butter", label: "Butter" },
  { id: "ink", label: "Ink" },
  { id: "transparent", label: "None" },
];

const SHAPES = ["normal", "wavy", "circle", "diagonal", "stacked", "scattered", "outlined", "arc"] as const;

export function GenerateStep() {
  const { setStep, setGenerated, setTheme, setEditedDoc, editedDoc, ...state } = useZine();
  const [loading, setLoading] = useState(true);
  const [msgIdx, setMsgIdx] = useState(0);

  // Snapshot doc once on entry. If editedDoc already exists (returning to step 3) keep it.
  const initialDoc = useMemo(
    () =>
      buildZine({
        title: state.title,
        format: state.format,
        vibe: state.vibe,
        photos: state.photos,
        videos: state.videos,
        audios: state.audios,
        words: state.words,
        pageCount: state.pageCount,
        spacingMode: state.spacingMode,
        pageSpacings: state.pageSpacings,
      }),
    // we intentionally lock the initial doc — the editor mutates editedDoc afterwards
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    setTheme("light");
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % MESSAGES.length), 700);
    const done = setTimeout(() => {
      setLoading(false);
      setGenerated(true);
      if (!editedDoc) setEditedDoc(initialDoc);
      clearInterval(t);
    }, 2200);
    return () => {
      clearInterval(t);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !editedDoc) {
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

  return (
    <Preview
      onExport={() => setStep(4)}
      onRegenerate={() => {
        // rebuild from current inputs
        const fresh = buildZine({
          title: state.title,
          format: state.format,
          vibe: state.vibe,
          photos: state.photos,
          videos: state.videos,
          audios: state.audios,
          words: state.words,
          pageCount: state.pageCount,
          spacingMode: state.spacingMode,
          pageSpacings: state.pageSpacings,
        });
        setEditedDoc(fresh);
      }}
    />
  );
}

type Selection = { kind: "photo" | "text" | "bg"; pageIdx: number } | null;

function Preview({ onExport, onRegenerate }: { onExport: () => void; onRegenerate: () => void }) {
  const {
    format,
    headerFont,
    bodyFont,
    vibe,
    textShape,
    igRatio,
    editedDoc,
    photos,
    pageSpacings,
    spacingMode,
    setSpacingMode,
    setPageSpacings,
    pageCount,
    updatePage,
    addPage,
    deletePage,
    movePage,
  } = useZine();

  const doc = editedDoc!;
  const [pageIdx, setPageIdx] = useState(0);
  const [selection, setSelection] = useState<Selection>(null);
  const safePageIdx = Math.min(pageIdx, doc.pages.length - 1);
  const page = doc.pages[safePageIdx];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);

  const isSpread = format === "two-page";
  const isInstagram = format === "instagram";

  const aspect = useMemo(() => {
    if (isSpread) return "16/10";
    if (isInstagram) return igRatio === "1:1" ? "1" : igRatio === "4:5" ? "4/5" : "9/16";
    if (format === "single-sheet") return "11/8.5";
    return "5/7";
  }, [format, igRatio, isSpread, isInstagram]);

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
  }, [safePageIdx, page?.audio]);

  // Clear selection when changing pages
  useEffect(() => setSelection(null), [safePageIdx]);

  const next = () => setPageIdx((i) => Math.min(i + 1, doc.pages.length - 1));
  const prev = () => setPageIdx((i) => Math.max(i - 1, 0));

  // ---- Spacing controls (live)
  const randomizeOn = !!pageSpacings;
  const toggleRandomize = () => {
    if (randomizeOn) {
      setPageSpacings(null);
    } else {
      const ranges: Record<SpacingMode, [number, number]> = {
        tight: [0.02, 0.10],
        balanced: [0.05, 0.16],
        full: [0.04, 0.22],
      };
      const [lo, hi] = ranges[spacingMode];
      const arr = Array.from({ length: pageCount }, () => +(lo + Math.random() * (hi - lo)).toFixed(3));
      setPageSpacings(arr);
    }
  };
  const setSpacingValue = (v: 0 | 1 | 2) => {
    const mode: SpacingMode = v === 0 ? "tight" : v === 1 ? "balanced" : "full";
    setSpacingMode(mode);
    // Live: write spacing onto every page (the snapshot will be reset by setSpacingMode → re-snapshot on next useEffect)
  };

  // Page strip DnD
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  return (
    <div className="grid gap-0 md:grid-cols-[1fr_340px] min-h-[calc(100vh-130px)]">
      <div
        className="flex flex-col items-center justify-start gap-5 bg-paper-deep/40 p-6 md:p-10"
        onClick={() => setSelection(null)}
      >
        <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-mid">
          <button onClick={prev} disabled={safePageIdx === 0} className="grid h-8 w-8 place-items-center border border-rule disabled:opacity-30">
            <ChevronLeft size={14} />
          </button>
          <span>{safePageIdx + 1} / {doc.pages.length} · {page.label}</span>
          <button onClick={next} disabled={safePageIdx === doc.pages.length - 1} className="grid h-8 w-8 place-items-center border border-rule disabled:opacity-30">
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Selection toolbar */}
        <SelectionToolbar
          selection={selection}
          page={page}
          photos={photos}
          onChange={(patch) => updatePage(safePageIdx, patch)}
          onClose={() => setSelection(null)}
        />

        <div
          className="relative w-full max-w-[480px] bg-paper shadow-[0_30px_60px_-30px_rgba(0,0,0,0.35)]"
          style={{ aspectRatio: aspect }}
          onClick={(e) => e.stopPropagation()}
        >
          {isSpread ? (
            <div className="absolute inset-0 grid grid-cols-2">
              <ZinePageView
                page={doc.pages[0]}
                headerFont={headerFont}
                bodyFont={bodyFont}
                vibe={vibe}
                shape={textShape}
                side="left"
                editable={safePageIdx === 0}
                selection={safePageIdx === 0 ? selection : null}
                onSelect={(kind) => setSelection({ kind, pageIdx: 0 })}
                onPhotoDrag={(x, y) => updatePage(0, { photoPosX: x, photoPosY: y })}
              />
              <ZinePageView
                page={doc.pages[1]}
                headerFont={headerFont}
                bodyFont={bodyFont}
                vibe={vibe}
                shape={textShape}
                side="right"
                editable={safePageIdx === 1}
                selection={safePageIdx === 1 ? selection : null}
                onSelect={(kind) => setSelection({ kind, pageIdx: 1 })}
                onPhotoDrag={(x, y) => updatePage(1, { photoPosX: x, photoPosY: y })}
              />
            </div>
          ) : (
            <ZinePageView
              page={page}
              headerFont={headerFont}
              bodyFont={bodyFont}
              vibe={vibe}
              shape={textShape}
              editable
              selection={selection}
              onSelect={(kind) => setSelection({ kind, pageIdx: safePageIdx })}
              onPhotoDrag={(x, y) => updatePage(safePageIdx, { photoPosX: x, photoPosY: y })}
              onTextEdit={(field, value) => updatePage(safePageIdx, { [field]: value } as Partial<ZinePage>)}
            />
          )}
          <div className="absolute bottom-1.5 right-2 font-mono text-[7px] tracking-[0.1em] text-ink-light/70 pointer-events-none">
            made with paperslice.app
          </div>
        </div>

        {page?.audio && (
          <button
            onClick={(e) => {
              e.stopPropagation();
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
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1 border border-rule bg-card px-2 py-0.5 hover:bg-paper-warm"
            title="Discard edits and re-generate"
          >
            <RefreshCw size={9} /> regenerate
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="bg-paper-warm p-6 md:p-7 flex flex-col gap-5 overflow-y-auto">
        {/* Photo spacing (live) */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <div className="label-xs">Photo spacing</div>
            <button
              onClick={toggleRandomize}
              className={`flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] transition ${
                randomizeOn
                  ? "border-[color:var(--accent-red)] bg-[color:var(--accent-red)] text-[color:var(--cotton)]"
                  : "border-rule bg-card text-ink-mid hover:bg-paper-deep"
              }`}
              title="Randomize spacing per page"
            >
              <Shuffle size={11} /> {randomizeOn ? "randomized ✓" : "randomize"}
            </button>
          </div>
          <div className="border border-rule bg-card px-4 py-4">
            <input
              type="range"
              min={0}
              max={2}
              step={1}
              value={spacingMode === "tight" ? 0 : spacingMode === "balanced" ? 1 : 2}
              onChange={(e) => setSpacingValue(Number(e.target.value) as 0 | 1 | 2)}
              disabled={randomizeOn}
              className="w-full accent-[color:var(--accent-red)] disabled:opacity-40"
            />
            <div className="mt-2 flex justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-ink-light">
              <span className={spacingMode === "tight" ? "text-ink" : ""}>Tight</span>
              <span className={spacingMode === "balanced" ? "text-ink" : ""}>Balanced</span>
              <span className={spacingMode === "full" ? "text-ink" : ""}>Full spread</span>
            </div>
          </div>
          {randomizeOn && (
            <p className="mt-2 font-serif text-[11px] italic text-ink-mid">
              Each page has its own spacing — your zine will feel handmade.
            </p>
          )}
        </section>

        {/* Pages strip */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <div className="label-xs">Pages</div>
            <span className="font-mono text-[9px] text-ink-light">drag to reorder</span>
          </div>
          <div className="grid grid-cols-4 gap-1 max-h-64 overflow-y-auto">
            {doc.pages.map((p, i) => (
              <div
                key={`${p.label}-${i}`}
                draggable
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIdx !== null && dragIdx !== i) movePage(dragIdx, i);
                  setDragIdx(null);
                  setPageIdx(i);
                }}
                onDragEnd={() => setDragIdx(null)}
                className={`group relative aspect-[3/4] cursor-move overflow-hidden border ${
                  i === safePageIdx ? "border-[color:var(--accent-red)]" : "border-rule"
                } ${dragIdx === i ? "opacity-40" : ""}`}
                title={p.label}
              >
                <button
                  onClick={() => setPageIdx(i)}
                  className="block h-full w-full"
                >
                  {p.photo ? (
                    <img src={p.photo.url} alt="" className="h-full w-full object-cover opacity-80" />
                  ) : (
                    <div
                      className="grid h-full w-full place-items-center font-mono text-[7px] text-ink-light"
                      style={{ background: p.bgToken === "transparent" ? "var(--paper)" : `var(--${p.bgToken ?? "paper"})` }}
                    >
                      {p.label}
                    </div>
                  )}
                </button>
                <span className="absolute bottom-0 left-0 right-0 bg-ink/60 px-1 py-[1px] font-mono text-[7px] text-[color:var(--paper)]">
                  {i + 1}
                </span>
                {doc.pages.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePage(i);
                      if (safePageIdx >= doc.pages.length - 1) setPageIdx(Math.max(0, doc.pages.length - 2));
                    }}
                    className="absolute right-0.5 top-0.5 hidden h-4 w-4 place-items-center rounded-full bg-ink/80 text-[color:var(--paper)] hover:bg-[color:var(--accent-red)] group-hover:grid"
                    title="Delete page"
                  >
                    <X size={9} />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addPage}
              className="grid aspect-[3/4] place-items-center border border-dashed border-rule text-ink-light hover:border-ink hover:text-ink"
              title="Add page"
            >
              <Plus size={16} />
            </button>
          </div>
        </section>

        {(format === "single-sheet" || format === "printable-zine" || format === "two-page") && (
          <p className="border-l-2 border-[color:var(--accent-red)] bg-card px-3 py-2 font-serif text-[11px] italic text-ink-mid">
            Audio & video play in digital preview only — print formats are silent.
          </p>
        )}

        <button
          onClick={onExport}
          className="mt-auto w-full bg-ink py-3.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--paper)] transition hover:bg-[color:var(--accent-red)]"
        >
          Export →
        </button>
      </aside>
    </div>
  );
}

/* ============================================================
 * SELECTION TOOLBAR
 * ============================================================ */
function SelectionToolbar({
  selection,
  page,
  photos,
  onChange,
  onClose,
}: {
  selection: Selection;
  page: ZinePage;
  photos: { id: string; name: string; url: string; size: number }[];
  onChange: (patch: Partial<ZinePage>) => void;
  onClose: () => void;
}) {
  const [showSwap, setShowSwap] = useState(false);
  const [showShape, setShowShape] = useState(false);
  if (!selection) return null;
  const kind = selection.kind;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-1 border border-rule bg-card px-2 py-1.5 shadow-[0_6px_18px_-12px_rgba(0,0,0,0.4)]"
    >
      <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-light">
        {kind === "photo" ? "photo" : kind === "text" ? "text" : "background"}
      </span>

      {kind === "photo" && (
        <>
          <div className="relative">
            <button
              onClick={() => { setShowSwap((v) => !v); setShowShape(false); }}
              className="flex items-center gap-1 border border-rule px-2 py-1 font-mono text-[9px] hover:bg-paper-warm"
            >
              <ImageIcon size={11} /> swap
            </button>
            {showSwap && (
              <div className="absolute left-0 top-full z-30 mt-1 grid w-[220px] grid-cols-4 gap-1 border border-rule bg-card p-2 shadow">
                {photos.length === 0 && (
                  <div className="col-span-4 p-2 font-mono text-[9px] text-ink-light">No photos uploaded.</div>
                )}
                {photos.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { onChange({ photo: p }); setShowSwap(false); }}
                    className={`aspect-square overflow-hidden border ${page.photo?.id === p.id ? "border-[color:var(--accent-red)]" : "border-rule"}`}
                  >
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => onChange({ photoFit: (page.photoFit ?? "cover") === "cover" ? "contain" : "cover" })}
            className="flex items-center gap-1 border border-rule px-2 py-1 font-mono text-[9px] hover:bg-paper-warm"
          >
            <Maximize2 size={11} /> {(page.photoFit ?? "cover") === "cover" ? "fill" : "fit"}
          </button>
          <span className="flex items-center gap-1 border border-rule px-2 py-1 font-mono text-[9px] text-ink-light">
            <Move size={11} /> drag photo
          </span>
          <button
            onClick={() => onChange({ photo: undefined })}
            className="flex items-center gap-1 border border-rule px-2 py-1 font-mono text-[9px] hover:bg-paper-warm"
          >
            <Trash2 size={11} /> remove
          </button>
        </>
      )}

      {kind === "text" && (
        <>
          <button
            onClick={() => onChange({ textSize: Math.max(0.6, (page.textSize ?? 1) - 0.1) })}
            className="grid h-7 w-7 place-items-center border border-rule font-mono text-[9px] hover:bg-paper-warm"
          ><Minus size={11} /></button>
          <span className="font-mono text-[9px] tabular-nums text-ink-mid w-8 text-center">{Math.round((page.textSize ?? 1) * 100)}%</span>
          <button
            onClick={() => onChange({ textSize: Math.min(1.8, (page.textSize ?? 1) + 0.1) })}
            className="grid h-7 w-7 place-items-center border border-rule font-mono text-[9px] hover:bg-paper-warm"
          ><Plus size={11} /></button>
          <div className="mx-1 h-5 w-px bg-rule" />
          {(["left", "center", "right"] as const).map((a) => {
            const Icon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : AlignRight;
            const on = (page.textAlign ?? "left") === a;
            return (
              <button
                key={a}
                onClick={() => onChange({ textAlign: a })}
                className={`grid h-7 w-7 place-items-center border ${on ? "border-[color:var(--accent-red)] bg-[color:var(--accent-red)]/10" : "border-rule"} hover:bg-paper-warm`}
              ><Icon size={11} /></button>
            );
          })}
          <div className="mx-1 h-5 w-px bg-rule" />
          <div className="relative">
            <button
              onClick={() => { setShowShape((v) => !v); setShowSwap(false); }}
              className="border border-rule px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] hover:bg-paper-warm"
            >
              shape: {page.textShape ?? "(auto)"}
            </button>
            {showShape && (
              <div className="absolute left-0 top-full z-30 mt-1 grid w-[200px] grid-cols-2 gap-1 border border-rule bg-card p-2 shadow">
                <button
                  onClick={() => { onChange({ textShape: undefined }); setShowShape(false); }}
                  className="border border-rule px-2 py-1 font-mono text-[9px] uppercase hover:bg-paper-warm"
                >auto</button>
                {SHAPES.map((s) => (
                  <button
                    key={s}
                    onClick={() => { onChange({ textShape: s }); setShowShape(false); }}
                    className={`border px-2 py-1 font-mono text-[9px] uppercase hover:bg-paper-warm ${page.textShape === s ? "border-[color:var(--accent-red)]" : "border-rule"}`}
                  >{s}</button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {kind === "bg" && (
        <div className="flex flex-wrap items-center gap-1">
          {BG_TOKENS.map((t) => {
            const on = (page.bgToken ?? "paper") === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onChange({ bgToken: t.id })}
                title={t.label}
                className={`h-6 w-6 border ${on ? "border-[color:var(--accent-red)] ring-1 ring-[color:var(--accent-red)]" : "border-rule"}`}
                style={{
                  background:
                    t.id === "transparent"
                      ? "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 8px 8px"
                      : `var(--${t.id})`,
                }}
              />
            );
          })}
        </div>
      )}

      <button
        onClick={onClose}
        className="ml-1 grid h-7 w-7 place-items-center border border-rule font-mono text-[9px] hover:bg-paper-warm"
        title="Close"
      ><X size={11} /></button>
    </div>
  );
}

/* ============================================================
 * ARTFUL HEADING
 * ============================================================ */
function ArtfulHeading({
  text,
  shape,
  font,
  size = 26,
  color = "var(--ink)",
  italic = false,
  weight = 700,
  align = "left",
}: {
  text: string;
  shape: string;
  font: string;
  size?: number;
  color?: string;
  italic?: boolean;
  weight?: number;
  align?: "left" | "center" | "right";
}) {
  const baseStyle: React.CSSProperties = {
    fontFamily: font,
    fontStyle: italic ? "italic" : "normal",
    fontWeight: weight,
    color,
    lineHeight: 1.0,
    textAlign: align,
  };

  if (shape === "wavy") {
    const chars = text.split("");
    return (
      <h3 className="flex flex-wrap" style={{ ...baseStyle, fontSize: size, gap: "0.04em", justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start" }}>
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
    const width = 320;
    const height = shape === "circle" ? 200 : 110;
    const pathD =
      shape === "circle"
        ? `M ${width / 2 - 80},${height / 2} a 80,80 0 1,1 160,0 a 80,80 0 1,1 -160,0`
        : `M 10,${height - 10} Q ${width / 2},10 ${width - 10},${height - 10}`;
    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ overflow: "visible" }}>
        <defs>
          <path id={`arc-${text.length}-${shape}-${Math.random().toString(36).slice(2, 7)}`} d={pathD} fill="none" />
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
  if (token === "transparent") return "transparent";
  return `var(--${token})`;
}

const DARK_TOKENS = new Set(["clay", "ink"]);

/* ============================================================
 * PHOTO with draggable position
 * ============================================================ */
function EditablePhoto({
  src,
  fit = "cover",
  posX = 50,
  posY = 50,
  filter,
  className,
  editable,
  selected,
  onDrag,
}: {
  src: string;
  fit?: "cover" | "contain";
  posX?: number;
  posY?: number;
  filter?: string;
  className?: string;
  editable?: boolean;
  selected?: boolean;
  onDrag?: (x: number, y: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handleDown = (e: React.PointerEvent) => {
    if (!editable || !selected || fit !== "cover" || !onDrag) return;
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const handleMove = (e: React.PointerEvent) => {
    if (!dragging.current || !ref.current || !onDrag) return;
    const rect = ref.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    onDrag(x, y);
  };
  const handleUp = () => { dragging.current = false; };

  return (
    <div
      ref={ref}
      className={className}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      style={{ cursor: editable && selected && fit === "cover" ? "move" : undefined }}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        className="h-full w-full select-none"
        style={{
          objectFit: fit,
          objectPosition: `${posX}% ${posY}%`,
          filter,
        }}
      />
    </div>
  );
}

/* ============================================================
 * EDITABLE TEXT (contentEditable)
 * ============================================================ */
function EditableText({
  value,
  onCommit,
  className,
  style,
  multiline,
}: {
  value: string;
  onCommit: (v: string) => void;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={className}
      style={style}
      onBlur={(e) => onCommit(e.currentTarget.innerText)}
      onKeyDown={(e) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
      }}
    >
      {value}
    </div>
  );
}

/* ============================================================
 * ZINE PAGE VIEW
 * ============================================================ */
function ZinePageView({
  page,
  headerFont,
  bodyFont,
  vibe,
  shape,
  side,
  editable,
  selection,
  onSelect,
  onPhotoDrag,
  onTextEdit,
}: {
  page: ZinePage;
  headerFont: string;
  bodyFont: string;
  vibe: string;
  shape: string;
  side?: "left" | "right";
  editable?: boolean;
  selection?: Selection;
  onSelect?: (kind: "photo" | "text" | "bg") => void;
  onPhotoDrag?: (x: number, y: number) => void;
  onTextEdit?: (field: "heading" | "body", value: string) => void;
}) {
  const bgToken = page.bgToken ?? "paper";
  const bg = tokenToBg(bgToken);
  const isDarkBg = !!bgToken && DARK_TOKENS.has(bgToken);
  const ink = isDarkBg ? "var(--cotton)" : "var(--ink)";
  const inkMid = isDarkBg
    ? "color-mix(in oklab, var(--cotton) 80%, transparent)"
    : "var(--ink-mid)";

  const grainOverlay =
    vibe === "grain"
      ? "after:absolute after:inset-0 after:opacity-30 after:mix-blend-multiply after:pointer-events-none after:[background-image:radial-gradient(circle_at_30%_20%,_transparent_0,_rgba(0,0,0,0.10)_100%)]"
      : "";

  const effectiveBodyFont = vibe === "typewriter" ? "Courier Prime" : bodyFont;
  const effectiveHeaderFont = vibe === "typewriter" ? "Courier Prime" : headerFont;
  const headerItalic = vibe === "editorial";
  const headerWeight = vibe === "minimal" || vibe === "typewriter" ? 400 : 700;
  const effShape = page.textShape ?? shape;
  const textAlign = page.textAlign ?? "left";
  const sizeMul = page.textSize ?? 1;

  const photoSelected = selection?.kind === "photo";
  const textSelected = selection?.kind === "text";

  const photoClick = (e: React.MouseEvent) => {
    if (!editable) return;
    e.stopPropagation();
    onSelect?.("photo");
  };
  const textClick = (e: React.MouseEvent) => {
    if (!editable) return;
    e.stopPropagation();
    onSelect?.("text");
  };
  const bgClick = (e: React.MouseEvent) => {
    if (!editable) return;
    e.stopPropagation();
    onSelect?.("bg");
  };

  const photoRing = photoSelected ? "outline outline-2 outline-[color:var(--accent-red)] outline-offset-2" : "";
  const textRing = textSelected ? "outline outline-2 outline-[color:var(--accent-red)] outline-offset-2" : "";

  const photoEl = (extraClass = "", filter?: string) =>
    page.photo && (
      <EditablePhoto
        src={page.photo.url}
        fit={page.photoFit ?? "cover"}
        posX={page.photoPosX ?? 50}
        posY={page.photoPosY ?? 50}
        filter={filter}
        editable={editable}
        selected={photoSelected}
        onDrag={onPhotoDrag}
        className={`relative h-full w-full overflow-hidden ${extraClass}`}
      />
    );

  const renderContent = () => {
    switch (page.layout) {
      case "cover":
        return (
          <div className="absolute inset-0 flex flex-col">
            {page.photo && (
              <div
                onClick={photoClick}
                className={`relative flex-1 overflow-hidden m-4 mb-3 ${photoRing}`}
                style={vibe === "colorful" ? { border: `6px solid ${page.frameColor || "var(--clay)"}` } : undefined}
              >
                {photoEl()}
              </div>
            )}
            <div
              onClick={textClick}
              className={`px-5 pb-5 ${textRing}`}
              style={{ cursor: editable ? "text" : undefined }}
            >
              {editable && onTextEdit ? (
                <EditableText
                  value={page.heading || "Untitled"}
                  onCommit={(v) => onTextEdit("heading", v)}
                  style={{
                    fontFamily: effectiveHeaderFont,
                    fontWeight: headerWeight,
                    fontStyle: headerItalic ? "italic" : "normal",
                    fontSize: (vibe === "colorful" ? 36 : 30) * sizeMul,
                    lineHeight: 1.0,
                    textAlign,
                    color: vibe === "colorful" ? "var(--clay)" : ink,
                  }}
                />
              ) : (
                <ArtfulHeading
                  text={page.heading || "Untitled"}
                  shape={effShape}
                  font={effectiveHeaderFont}
                  size={(vibe === "colorful" ? 36 : 30) * sizeMul}
                  color={vibe === "colorful" ? "var(--clay)" : ink}
                  italic={headerItalic}
                  weight={headerWeight}
                  align={textAlign}
                />
              )}
              <div className="mt-2 font-mono text-[8px] uppercase tracking-[0.22em]" style={{ color: inkMid }}>
                a paperslice zine
              </div>
            </div>
          </div>
        );

      case "back":
        return (
          <div className="absolute inset-0 grid place-items-center" onClick={textClick}>
            <div className={`text-center ${textRing}`}>
              {vibe === "colorful" && (
                <div className="mx-auto mb-3 flex gap-1 justify-center">
                  {["var(--clay)","var(--sage)","var(--sky)","var(--blush)","var(--lavender)","var(--butter)"].map((c)=>(
                    <span key={c} className="h-2 w-2 rounded-full" style={{background: c}} />
                  ))}
                </div>
              )}
              <ArtfulHeading text={page.heading || "fin."} shape={effShape} font={effectiveHeaderFont} size={28 * sizeMul} color={ink} italic align={textAlign} />
              <div className="mt-2 font-mono text-[8px] uppercase tracking-[0.22em]" style={{ color: inkMid }}>
                paperslice.app
              </div>
            </div>
          </div>
        );

      case "photo-bleed":
        return (
          <div onClick={photoClick} className={`absolute inset-0 ${photoRing}`}>
            {photoEl("absolute inset-0", page.photoFilter)}
          </div>
        );

      case "photo-card":
        return (
          <div className="absolute inset-0 flex flex-col p-5">
            {page.photo && (
              <div
                onClick={photoClick}
                className={`relative aspect-[4/5] overflow-hidden mb-3 shadow-[0_4px_12px_-6px_rgba(0,0,0,0.25)] ${photoRing}`}
              >
                {photoEl("", page.photoFilter)}
              </div>
            )}
            {page.body !== undefined && (
              <div onClick={textClick} className={textRing} style={{ cursor: editable ? "text" : undefined }}>
                {editable && onTextEdit ? (
                  <EditableText
                    value={page.body || ""}
                    onCommit={(v) => onTextEdit("body", v)}
                    multiline
                    style={{
                      fontFamily: effectiveBodyFont,
                      color: inkMid,
                      fontStyle: headerItalic ? "italic" : "normal",
                      fontSize: 9.5 * sizeMul,
                      lineHeight: 1.55,
                      textAlign,
                    }}
                  />
                ) : (
                  <p
                    className="leading-[1.55]"
                    style={{ fontFamily: effectiveBodyFont, color: inkMid, fontStyle: headerItalic ? "italic" : "normal", fontSize: 9.5 * sizeMul, textAlign }}
                  >
                    {(page.body || "").slice(0, 160)}{(page.body || "").length > 160 ? "…" : ""}
                  </p>
                )}
              </div>
            )}
          </div>
        );

      case "photo-bordered":
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
            {page.photo && (
              <div
                onClick={photoClick}
                className={`relative aspect-square w-[78%] overflow-hidden ${photoRing}`}
                style={{
                  border: `8px solid ${page.frameColor || "var(--clay)"}`,
                  transform: `rotate(${page.rotate ?? 0}deg)`,
                  boxShadow: "0 10px 24px -14px rgba(0,0,0,0.35)",
                }}
              >
                {photoEl("", page.photoFilter)}
              </div>
            )}
            {page.heading && (
              <div
                onClick={textClick}
                className={`mt-4 font-mono text-[9px] uppercase tracking-[0.22em] text-center ${textRing}`}
                style={{ color: ink, fontSize: 9 * sizeMul, textAlign }}
              >
                {page.heading.slice(0, 40)}
              </div>
            )}
          </div>
        );

      case "photo-polaroid":
        return (
          <div className="absolute inset-0 grid place-items-center p-6">
            <div
              onClick={photoClick}
              className={`relative bg-[color:var(--cotton)] p-2 pb-7 shadow-[0_8px_18px_-8px_rgba(0,0,0,0.4)] ${photoRing}`}
              style={{ transform: `rotate(${page.rotate ?? -3}deg)` }}
            >
              <div className="tape absolute -top-2 left-1/2 h-4 w-12 -translate-x-1/2 rotate-[2deg]" />
              {page.photo && (
                <div className="aspect-square w-40 overflow-hidden">
                  {photoEl("", page.photoFilter)}
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
              <div
                onClick={photoClick}
                className={`relative overflow-hidden ${photoRing}`}
                style={page.frameColor ? { border: `4px solid ${page.frameColor}` } : undefined}
              >
                {photoEl("", page.photoFilter)}
              </div>
            )}
            {page.photoB && (
              <div
                className="relative overflow-hidden ml-6"
                style={page.frameColor ? { border: `4px solid ${page.frameColor}` } : undefined}
              >
                <img src={page.photoB.url} alt="" className="h-full w-full object-cover" style={page.photoFilter ? { filter: page.photoFilter } : undefined} />
              </div>
            )}
          </div>
        );

      case "photo-tiny":
        return (
          <div className="absolute inset-0 grid place-items-center p-10">
            {page.photo && (
              <div
                onClick={photoClick}
                className={`aspect-square w-28 overflow-hidden shadow-[0_6px_14px_-8px_rgba(0,0,0,0.35)] ${photoRing}`}
                style={{ transform: `rotate(${page.rotate ?? 0}deg)` }}
              >
                {photoEl("", page.photoFilter)}
              </div>
            )}
          </div>
        );

      case "text-only":
        return (
          <div onClick={textClick} className={`absolute inset-0 flex flex-col justify-center p-7 ${textRing}`} style={{ cursor: editable ? "text" : undefined }}>
            {page.heading && (
              editable && onTextEdit ? (
                <EditableText
                  value={page.heading}
                  onCommit={(v) => onTextEdit("heading", v)}
                  style={{
                    fontFamily: effectiveHeaderFont,
                    fontWeight: headerWeight,
                    fontStyle: headerItalic ? "italic" : "normal",
                    fontSize: (vibe === "colorful" ? 28 : 22) * sizeMul,
                    color: ink,
                    lineHeight: 1.0,
                    textAlign,
                  }}
                />
              ) : (
                <ArtfulHeading
                  text={page.heading}
                  shape={effShape}
                  font={effectiveHeaderFont}
                  size={(vibe === "colorful" ? 28 : 22) * sizeMul}
                  color={ink}
                  italic={headerItalic}
                  weight={headerWeight}
                  align={textAlign}
                />
              )
            )}
            {page.body && (
              editable && onTextEdit ? (
                <EditableText
                  value={page.body}
                  onCommit={(v) => onTextEdit("body", v)}
                  multiline
                  className="mt-3"
                  style={{
                    fontFamily: effectiveBodyFont,
                    color: inkMid,
                    fontStyle: headerItalic ? "italic" : "normal",
                    fontSize: 11 * sizeMul,
                    lineHeight: 1.7,
                    textAlign,
                  }}
                />
              ) : (
                <p
                  className="mt-3 leading-[1.7]"
                  style={{ fontFamily: effectiveBodyFont, color: inkMid, fontStyle: headerItalic ? "italic" : "normal", fontSize: 11 * sizeMul, textAlign }}
                >
                  {page.body.slice(0, 280)}{page.body.length > 280 ? "…" : ""}
                </p>
              )
            )}
          </div>
        );

      case "text-pullquote":
        return (
          <div onClick={textClick} className={`absolute inset-0 flex flex-col justify-center p-7 ${textRing}`} style={{ cursor: editable ? "text" : undefined }}>
            <div className="mb-2 font-mono text-[8px] uppercase tracking-[0.22em]" style={{ color: inkMid, textAlign }}>—</div>
            {editable && onTextEdit ? (
              <EditableText
                value={page.body || page.heading || ""}
                onCommit={(v) => onTextEdit("body", v)}
                multiline
                style={{
                  fontFamily: effectiveHeaderFont,
                  color: ink,
                  fontStyle: "italic",
                  fontSize: 18 * sizeMul,
                  lineHeight: 1.3,
                  textAlign,
                }}
              />
            ) : (
              <p className="italic leading-[1.3]" style={{ color: ink, fontFamily: effectiveHeaderFont, fontSize: 18 * sizeMul, textAlign }}>
                "{(page.body || page.heading || "").slice(0, 120)}{((page.body || page.heading || "")).length > 120 ? "…" : ""}"
              </p>
            )}
          </div>
        );

      case "text-block":
        return (
          <div onClick={textClick} className={`absolute inset-0 flex flex-col p-7 ${textRing}`} style={{ cursor: editable ? "text" : undefined }}>
            {page.heading && (
              editable && onTextEdit ? (
                <EditableText
                  value={page.heading}
                  onCommit={(v) => onTextEdit("heading", v)}
                  className="mb-3"
                  style={{ fontFamily: "Courier Prime", color: ink, fontSize: 12 * sizeMul, textTransform: "uppercase", letterSpacing: "0.05em", textAlign }}
                />
              ) : (
                <div
                  className="mb-3 uppercase tracking-[0.05em]"
                  style={{ color: ink, fontFamily: "Courier Prime", fontSize: 12 * sizeMul, textAlign }}
                >
                  {page.heading}
                </div>
              )
            )}
            {page.body && (
              editable && onTextEdit ? (
                <EditableText
                  value={page.body}
                  onCommit={(v) => onTextEdit("body", v)}
                  multiline
                  style={{ color: inkMid, fontFamily: "Courier Prime", fontSize: 10 * sizeMul, lineHeight: 1.7, whiteSpace: "pre-wrap", textAlign }}
                />
              ) : (
                <pre
                  className="whitespace-pre-wrap leading-[1.7]"
                  style={{ color: inkMid, fontFamily: "Courier Prime", fontSize: 10 * sizeMul, textAlign }}
                >
                  {page.body.slice(0, 360)}{page.body.length > 360 ? "…" : ""}
                </pre>
              )
            )}
          </div>
        );

      case "color-block":
        return (
          <div className="absolute inset-0 flex flex-col items-end justify-end p-5">
            <span
              className="font-mono text-[8px] uppercase tracking-[0.3em]"
              style={{ color: inkMid }}
            >
              {page.label}
            </span>
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

  // Apply per-page spacing as outer padding. Cover/back/video keep zero (full-bleed).
  const skipSpacing =
    page.layout === "cover" ||
    page.layout === "back" ||
    page.layout === "video";
  const pad = !skipSpacing && page.spacing ? `${(page.spacing * 100).toFixed(1)}%` : "0";

  const bgRing = selection?.kind === "bg" ? "outline outline-2 outline-[color:var(--accent-red)] -outline-offset-2" : "";

  return (
    <div
      onClick={bgClick}
      className={`relative h-full w-full overflow-hidden ${grainOverlay} ${bgRing} ${side === "right" ? "border-l border-rule" : ""}`}
      style={{ background: bg, padding: pad, cursor: editable ? "pointer" : undefined }}
    >
      <div className="relative h-full w-full">{renderContent()}</div>
    </div>
  );
}
