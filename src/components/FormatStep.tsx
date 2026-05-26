import { Minus, Plus, Shuffle } from "lucide-react";
import { useZine, HEADER_FONTS, BODY_FONTS, pageCountConfig, type Format, type IGRatio, type TextShape, type Vibe, type SpacingMode } from "@/lib/store";

const FORMATS: { id: Format; name: string; desc: string; badge: string }[] = [
  { id: "single-sheet", name: "Single Sheet", desc: "8-panel · fold + cut one page", badge: "A4 / Letter" },
  { id: "ebook", name: "E-book", desc: "Screen PDF · audio + video", badge: "Portrait" },
  { id: "printable-zine", name: "Printable Zine", desc: "A5 · two-sided · staple spine", badge: "A5" },
  { id: "two-page", name: "Two-Page Spread", desc: "Editorial · shareable as image", badge: "2-pg" },
  { id: "instagram", name: "Instagram Zine", desc: "20 slides · numbered PNGs + media", badge: "1:1 · 4:5 · 9:16" },
];

const SHAPES: { id: TextShape; label: string; icon: string }[] = [
  { id: "normal", label: "Normal", icon: "≡" },
  { id: "wavy", label: "Wavy", icon: "∿" },
  { id: "circle", label: "Circle", icon: "◯" },
  { id: "diagonal", label: "Diagonal", icon: "⟋" },
  { id: "stacked", label: "Stacked", icon: "▤" },
  { id: "scattered", label: "Scattered", icon: "❋" },
  { id: "outlined", label: "Outlined", icon: "□" },
  { id: "arc", label: "Arc", icon: "⌒" },
];

const VIBES: { id: Vibe; label: string }[] = [
  { id: "grain", label: "Grain & Grit" },
  { id: "editorial", label: "Clean Editorial" },
  { id: "collage", label: "Raw Collage" },
  { id: "typewriter", label: "Typewriter" },
  { id: "minimal", label: "Minimal" },
  { id: "colorful", label: "Colorful" },
];

export function FormatStep() {
  const {
    format,
    setFormat,
    igRatio,
    setIGRatio,
    pageCount,
    setPageCount,
    spacingMode,
    setSpacingMode,
    pageSpacings,
    setPageSpacings,
    photos,
    words,
    headerFont,
    bodyFont,
    setHeaderFont,
    setBodyFont,
    textShape,
    setTextShape,
    vibe,
    setVibe,
    setStep,
  } = useZine();

  const cfg = pageCountConfig(format);
  const textBlocks = words.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).length;

  const stepPages = (dir: 1 | -1) => {
    const next = pageCount + dir * cfg.step;
    if (next < cfg.min || next > cfg.max) return;
    setPageCount(next);
  };

  const randomizeSpacing = () => {
    // Range bounded by selected mode
    const ranges: Record<SpacingMode, [number, number]> = {
      tight: [0.02, 0.10],
      balanced: [0.05, 0.16],
      full: [0.04, 0.22],
    };
    const [lo, hi] = ranges[spacingMode];
    const arr = Array.from({ length: pageCount }, () => +(lo + Math.random() * (hi - lo)).toFixed(3));
    setPageSpacings(arr);
  };

  return (
    <div className="grid gap-0 md:grid-cols-[1fr_360px] min-h-[calc(100vh-130px)]">
      {/* Left: formats */}
      <div className="border-b border-rule bg-card p-6 md:border-b-0 md:border-r md:p-10">
        <h2 className="mb-1 font-display text-3xl font-bold">Choose a format</h2>
        <p className="font-serif italic text-ink-mid mb-7">Five ways to slice your zine.</p>

        <div className="grid gap-3 sm:grid-cols-2">
          {FORMATS.map((f) => {
            const sel = format === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={`group relative overflow-hidden border bg-card p-5 text-left transition ${
                  sel ? "border-[color:var(--accent-red)] shadow-[0_0_0_3px_var(--paper-deep)]" : "border-rule hover:border-ink-light"
                }`}
              >
                {sel && (
                  <span className="absolute right-3 top-3 grid h-2 w-2 place-items-center rounded-full bg-[color:var(--accent-red)]" />
                )}
                <div className="label-xs mb-2">{f.badge}</div>
                <div className="font-display text-xl font-semibold leading-tight">{f.name}</div>
                <div className="mt-2 font-serif text-[12px] italic text-ink-mid">{f.desc}</div>

                {f.id === "single-sheet" && sel && (
                  <FoldDiagram />
                )}
                {f.id === "instagram" && sel && (
                  <div className="mt-4 flex gap-1.5">
                    {(["1:1", "4:5", "9:16"] as IGRatio[]).map((r) => (
                      <span
                        key={r}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIGRatio(r);
                        }}
                        className={`cursor-pointer border px-2 py-1 font-mono text-[9px] tracking-[0.1em] ${
                          igRatio === r ? "border-ink bg-ink text-[color:var(--paper)]" : "border-rule text-ink-mid"
                        }`}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Page count + spacing */}
        <div className="mt-8 grid gap-6 border-t border-rule pt-7 md:grid-cols-2">
          {/* Page count */}
          <section>
            <div className="label-xs mb-3">Page count</div>
            {cfg.fixed ? (
              <div className="border border-rule bg-card px-4 py-3 font-mono text-[11px] text-ink-mid">
                {cfg.note}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => stepPages(-1)}
                  disabled={pageCount - cfg.step < cfg.min}
                  className="grid h-10 w-10 place-items-center border border-rule bg-card text-ink hover:bg-paper-warm disabled:opacity-30"
                  aria-label="Decrease pages"
                >
                  <Minus size={14} />
                </button>
                <div className="flex-1 border border-rule bg-card px-4 py-2.5 text-center font-display text-2xl text-ink">
                  {pageCount}
                </div>
                <button
                  onClick={() => stepPages(1)}
                  disabled={pageCount + cfg.step > cfg.max}
                  className="grid h-10 w-10 place-items-center border border-rule bg-card text-ink hover:bg-paper-warm disabled:opacity-30"
                  aria-label="Increase pages"
                >
                  <Plus size={14} />
                </button>
              </div>
            )}
            <p className="mt-2 font-mono text-[10px] text-ink-light">
              {cfg.fixed
                ? `Your ${photos.length} photos and ${textBlocks} text blocks will be distributed across ${cfg.default} pages.`
                : `Range: ${cfg.min}${cfg.step > 1 ? `, ${cfg.min + cfg.step}, ${cfg.min + cfg.step * 2}…` : `–${cfg.max}`} · Your ${photos.length} photos and ${textBlocks} text blocks will be distributed across ${pageCount} pages.`}
            </p>
          </section>

          {/* Photo spacing */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div className="label-xs">Photo spacing</div>
              <button
                onClick={randomizeSpacing}
                className="flex items-center gap-1.5 border border-rule bg-card px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mid hover:bg-paper-warm"
                title="Randomize spacing per page"
              >
                <Shuffle size={11} /> randomize spacing
              </button>
            </div>
            <div className="border border-rule bg-card px-4 py-4">
              <input
                type="range"
                min={0}
                max={2}
                step={1}
                value={spacingMode === "tight" ? 0 : spacingMode === "balanced" ? 1 : 2}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setSpacingMode(v === 0 ? "tight" : v === 1 ? "balanced" : "full");
                }}
                className="w-full accent-[color:var(--accent-red)]"
              />
              <div className="mt-2 flex justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-ink-light">
                <span className={spacingMode === "tight" ? "text-ink" : ""}>Tight</span>
                <span className={spacingMode === "balanced" ? "text-ink" : ""}>Balanced</span>
                <span className={spacingMode === "full" ? "text-ink" : ""}>Full spread</span>
              </div>
            </div>
            {pageSpacings ? (
              <p className="mt-2 font-serif text-[11px] italic text-ink-mid">
                Each page has its own spacing — your zine will feel handmade.
              </p>
            ) : (
              <p className="mt-2 font-mono text-[10px] text-ink-light">
                {spacingMode === "tight" && "Photos fill most of the panel — punchy and dense."}
                {spacingMode === "balanced" && "Comfortable editorial margins."}
                {spacingMode === "full" && "Photos bleed with generous breathing room — one per page."}
              </p>
            )}
          </section>
        </div>
      </div>

      {/* Right: typography + shape + vibe */}
      <aside className="bg-paper-warm p-6 md:p-7 flex flex-col gap-7 overflow-y-auto">
        {/* Typography */}
        <section>
          <div className="label-xs mb-3">Typography</div>
          <div className="grid grid-cols-2 gap-2">
            <FontSelect label="Header" value={headerFont} options={HEADER_FONTS} onChange={setHeaderFont} />
            <FontSelect label="Body" value={bodyFont} options={BODY_FONTS} onChange={setBodyFont} />
          </div>
          <div className="mt-3 border border-rule bg-card p-4">
            <div style={{ fontFamily: headerFont }} className="text-[22px] leading-tight">
              A City Without Grammar
            </div>
            <div style={{ fontFamily: bodyFont }} className="mt-2 text-[11px] leading-[1.7] text-ink-mid">
              We took the long way down Insurgentes, stopping wherever the light looked right.
            </div>
          </div>
        </section>

        {/* Shape */}
        <section>
          <div className="label-xs mb-3">Text shape</div>
          <div className="grid grid-cols-4 gap-1">
            {SHAPES.map((s) => (
              <button
                key={s.id}
                onClick={() => setTextShape(s.id)}
                className={`flex flex-col items-center gap-1 border bg-card px-1 py-2.5 transition ${
                  textShape === s.id ? "border-[color:var(--accent-red)]" : "border-rule hover:bg-paper-deep"
                }`}
              >
                <span className="text-base text-ink-mid">{s.icon}</span>
                <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-ink-light">{s.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Vibe */}
        <section>
          <div className="label-xs mb-3">Vibe</div>
          <div className="flex flex-wrap gap-1.5">
            {VIBES.map((v) => (
              <button
                key={v.id}
                onClick={() => setVibe(v.id)}
                className={`border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition ${
                  vibe === v.id ? "border-ink bg-ink text-[color:var(--paper)]" : "border-rule text-ink-mid hover:bg-card"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </section>

        <button
          onClick={() => setStep(3)}
          className="mt-auto w-full bg-ink py-3.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--paper)] transition hover:bg-[color:var(--accent-red)]"
        >
          Generate my zine →
        </button>
      </aside>
    </div>
  );
}

function FontSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 border border-rule bg-card px-2.5 py-2">
      <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-ink-light">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-[12px] text-ink outline-none cursor-pointer"
        style={{ fontFamily: value }}
      >
        {options.map((o) => (
          <option key={o} value={o} style={{ fontFamily: o }}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

// 8-panel fold layout (printed front side, panels arranged so single horizontal cut + fold
// produces correct page order). Front face panels (left→right, top→bottom):
// [p.2(rot)] [cover(rot)] [back(rot)] [p.7(rot)]
// [p.3]       [p.4]        [p.5]       [p.6]
const FOLD_FRONT = ["p.2", "cover", "back", "p.7", "p.3", "p.4", "p.5", "p.6"];

function FoldDiagram() {
  return (
    <div className="mt-4 border border-rule bg-paper p-3">
      <div className="grid grid-cols-4 gap-[2px]">
        {FOLD_FRONT.map((label, i) => {
          const isCover = label === "cover";
          const rotated = i < 4;
          return (
            <div
              key={i}
              className={`flex aspect-[3/4] items-center justify-center border text-[8px] tracking-[0.08em] ${
                isCover
                  ? "border-[color:var(--accent-red)] bg-[color:var(--accent-red)]/10 text-[color:var(--accent-red)]"
                  : "border-rule text-ink-light"
              } ${rotated ? "rotate-180" : ""}`}
            >
              {label}
            </div>
          );
        })}
      </div>
      <div className="mt-2 font-mono text-[9px] text-ink-light">
        Print, fold in half, cut center slit, fold into booklet
      </div>
    </div>
  );
}
