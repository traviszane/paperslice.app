import { useZine, type Step } from "@/lib/store";
import { Moon, Sun, LogOut } from "lucide-react";
import { Link } from "@tanstack/react-router";
import logoFold from "@/assets/logo-paperslice-color.png";
import { useAuth, TIER_LABEL } from "@/hooks/use-auth";

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "upload" },
  { n: 2, label: "format" },
  { n: 3, label: "generate" },
  { n: 4, label: "export" },
];

export function Topbar() {
  const { step, setStep, theme, toggleTheme, photos, videos, audios, words, generated } = useZine();
  const { user, profile, signOut } = useAuth();

  const wordCount = words.trim() ? 1 : 0;
  const counts = [
    photos.length && `${photos.length} photo${photos.length > 1 ? "s" : ""}`,
    videos.length && `${videos.length} video${videos.length > 1 ? "s" : ""}`,
    wordCount && `${wordCount} text`,
    audios.length && `${audios.length} audio`,
  ]
    .filter(Boolean)
    .join(" · ");

  // Step gating: can only advance once prior step is satisfied.
  // Going BACK to any unlocked step is always allowed — data is preserved in the store.
  const hasUpload = photos.length + videos.length + audios.length > 0 || words.trim().length > 0;
  const canAccess = (s: Step): boolean => {
    if (s === 1) return true;
    if (s === 2) return hasUpload;          // need at least one upload to format
    if (s === 3) return hasUpload;          // format has defaults, so unlocks with upload
    if (s === 4) return hasUpload && generated; // must have generated a zine to export
    return false;
  };
  const lockedReason = (s: Step): string | undefined => {
    if (canAccess(s)) return undefined;
    if (s === 2 || s === 3) return "Add at least one photo, video, audio clip, or some text first";
    if (s === 4) return "Generate your zine first";
    return undefined;
  };
  const tryGoto = (s: Step) => { if (canAccess(s)) setStep(s); };

  return (
    <header className="border-b border-rule bg-card">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-6 px-6 py-4 md:px-10">
        <button
          onClick={() => setStep(1)}
          className="flex items-center leading-none shrink-0"
          aria-label="Paperslice home"
        >
          <img
            src={logoFold}
            alt="paperslice"
            width={1536}
            height={1024}
            className="h-16 w-auto md:h-20 -my-3 object-contain"
            style={{ maxWidth: "240px" }}
          />
        </button>

        {/* Brand color confetti */}
        <div className="hidden items-center gap-1 lg:flex" aria-hidden>
          {["var(--clay)","var(--sage)","var(--sky)","var(--blush)","var(--lavender)","var(--butter)"].map((c)=>(
            <span key={c} className="h-2.5 w-2.5 rounded-full" style={{background:`color-mix(in oklab, ${c} 92%, transparent)`}} />
          ))}
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          <div className="flex items-center overflow-hidden rounded-full border border-rule bg-paper-warm">
            {STEPS.map((s, i) => {
              const active = step === s.n;
              const done = step > s.n;
              const unlocked = canAccess(s.n);
              const stepColors = ["var(--sky)", "var(--sage)", "var(--blush)", "var(--butter)"];
              const dotColor = stepColors[i];
              return (
                <button
                  key={s.n}
                  onClick={() => tryGoto(s.n)}
                  disabled={!unlocked}
                  title={lockedReason(s.n)}
                  className={`group flex items-center gap-1.5 px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.15em] transition ${
                    active
                      ? "bg-[color:var(--clay)] text-[color:var(--cotton)]"
                      : !unlocked
                      ? "cursor-not-allowed text-ink-light/40"
                      : done
                      ? "text-[color:var(--accent-red)] hover:bg-paper-deep"
                      : "text-ink-light hover:bg-paper-deep"
                  } ${i > 0 ? "border-l border-rule" : ""}`}
                  aria-current={active ? "step" : undefined}
                  aria-disabled={!unlocked}
                >
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{
                      background: active ? "var(--cotton)" : unlocked ? dotColor : "var(--rule)",
                      opacity: !unlocked && !active ? 0.5 : 1,
                    }}
                  />
                  <span className="opacity-70">{s.n}</span>
                  <span>·</span>
                  <span>{s.label}</span>
                  {!unlocked && <span className="ml-0.5 opacity-60">🔒</span>}
                </button>
              );
            })}
          </div>
        </nav>


        <div className="flex items-center gap-3">
          <div className="hidden font-mono text-[10px] tracking-[0.05em] text-ink-light xl:block">
            {counts || "0 files"}
          </div>
          <button
            onClick={toggleTheme}
            className="grid h-8 w-8 place-items-center rounded-full border border-rule text-ink-mid transition hover:bg-paper-warm"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon size={13} /> : <Sun size={13} />}
          </button>

          {user && profile ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                to="/u/$username"
                params={{ username: profile.username }}
                className="border border-rule px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink hover:bg-paper-warm"
              >
                @{profile.username}
                <span className="ml-2 text-[9px] text-ink-light">· {TIER_LABEL[profile.tier]}</span>
              </Link>
              <button
                onClick={signOut}
                className="grid h-8 w-8 place-items-center rounded-full border border-rule text-ink-mid hover:bg-paper-warm"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut size={12} />
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="hidden border border-rule px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink transition hover:bg-paper-warm md:block"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>

      {/* Mobile step indicator */}
      <div className="flex items-center justify-center gap-1 border-t border-rule bg-paper-warm px-3 py-2 md:hidden">
        {STEPS.map((s) => {
          const active = step === s.n;
          const unlocked = canAccess(s.n);
          return (
            <button
              key={s.n}
              onClick={() => tryGoto(s.n)}
              disabled={!unlocked}
              title={lockedReason(s.n)}
              className={`flex-1 rounded-full px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] ${
                active
                  ? "bg-[color:var(--clay)] text-[color:var(--cotton)]"
                  : !unlocked
                  ? "cursor-not-allowed text-ink-light/40"
                  : "text-ink-light"
              }`}
            >
              {s.n}·{s.label}{!unlocked && !active ? " 🔒" : ""}
            </button>
          );
        })}
      </div>

    </header>
  );
}

export function PublishBanner() {
  const { user, profile } = useAuth();

  // Torn-paper collage strip — overlapping brand-color swatches behind the message
  const swatches = [
    { c: "var(--butter)",   left: "0%",   w: "22%", rot: "-1.2deg", top: "-18%" },
    { c: "var(--sky)",      left: "16%",  w: "24%", rot: "0.8deg",  top: "12%"  },
    { c: "var(--blush)",    left: "36%",  w: "22%", rot: "-0.6deg", top: "-12%" },
    { c: "var(--sage)",     left: "54%",  w: "22%", rot: "1.1deg",  top: "10%"  },
    { c: "var(--lavender)", left: "72%",  w: "20%", rot: "-0.9deg", top: "-14%" },
    { c: "var(--clay)",     left: "84%",  w: "20%", rot: "0.6deg",  top: "8%"   },
  ];

  const message = user && profile ? (
    <>
      <span className="text-ink/75">
        Signed in as <span className="font-medium text-ink">@{profile.username}</span> · {TIER_LABEL[profile.tier]} tier
      </span>
      <Link
        to="/u/$username"
        params={{ username: profile.username }}
        className="font-medium uppercase tracking-[0.12em] text-[color:var(--clay)] hover:underline"
      >
        view your profile →
      </Link>
    </>
  ) : (
    <>
      <span className="text-ink/75">
        Sign in to publish your zine — get a public link + embed code
      </span>
      <Link
        to="/auth"
        className="font-medium uppercase tracking-[0.12em] text-[color:var(--clay)] hover:underline"
      >
        create a free account →
      </Link>
    </>
  );

  return (
    <div className="relative overflow-hidden border-b border-rule bg-paper-warm">
      {/* paper-swatch collage layer */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {swatches.map((s, i) => (
          <span
            key={i}
            className="absolute h-[180%] rounded-[2px]"
            style={{
              left: s.left,
              top: s.top,
              width: s.w,
              transform: `rotate(${s.rot})`,
              background: `color-mix(in oklab, ${s.c} 70%, var(--cotton))`,
              boxShadow: "0 1px 0 oklch(0 0 0 / 0.04)",
              mixBlendMode: "multiply",
            }}
          />
        ))}
        {/* subtle paper wash on top so text stays legible */}
        <span className="absolute inset-0" style={{ background: "color-mix(in oklab, var(--cotton) 35%, transparent)" }} />
      </div>

      <div className="relative mx-auto flex max-w-[1180px] flex-wrap items-center justify-center gap-3 px-6 py-2 font-mono text-[10px] tracking-[0.05em]">
        <span className="hidden h-1.5 w-1.5 rounded-full bg-[color:var(--clay)] sm:inline-block" />
        {message}
      </div>
    </div>
  );
}
