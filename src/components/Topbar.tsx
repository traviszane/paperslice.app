import { useZine, type Step } from "@/lib/store";
import { Moon, Sun, LogOut } from "lucide-react";
import { Link } from "@tanstack/react-router";
import logoFold from "@/assets/logo-paperslice.png";
import { useAuth, TIER_LABEL } from "@/hooks/use-auth";

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "upload" },
  { n: 2, label: "format" },
  { n: 3, label: "generate" },
  { n: 4, label: "export" },
];

export function Topbar() {
  const { step, setStep, theme, toggleTheme, photos, videos, audios, words } = useZine();
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
              const stepColors = ["var(--sky)", "var(--sage)", "var(--blush)", "var(--butter)"];
              const dotColor = stepColors[i];
              return (
                <button
                  key={s.n}
                  onClick={() => setStep(s.n)}
                  className={`group flex items-center gap-1.5 px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.15em] transition ${
                    active
                      ? "bg-ink text-[color:var(--cotton)]"
                      : done
                      ? "text-[color:var(--accent-red)] hover:bg-paper-deep"
                      : "text-ink-light hover:bg-paper-deep"
                  } ${i > 0 ? "border-l border-rule" : ""}`}
                  aria-current={active ? "step" : undefined}
                >
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: active ? "var(--cotton)" : dotColor }}
                  />
                  <span className="opacity-70">{s.n}</span>
                  <span>·</span>
                  <span>{s.label}</span>
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
          return (
            <button
              key={s.n}
              onClick={() => setStep(s.n)}
              className={`flex-1 rounded-full px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] ${
                active ? "bg-ink text-[color:var(--cotton)]" : "text-ink-light"
              }`}
            >
              {s.n}·{s.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}

export function PublishBanner() {
  const { user, profile } = useAuth();
  if (user && profile) {
    return (
      <div className="overflow-hidden border-b border-rule bg-ink text-[color:var(--cotton)]">
        <div className="mx-auto flex max-w-[1180px] items-center justify-center gap-3 px-6 py-2 font-mono text-[10px] tracking-[0.05em]">
          <span className="hidden h-1.5 w-1.5 rounded-full bg-[color:var(--accent-red)] sm:inline-block" />
          <span className="text-[color:var(--cotton)]/80">
            Signed in as @{profile.username} · {TIER_LABEL[profile.tier]} tier
          </span>
          <Link
            to="/u/$username"
            params={{ username: profile.username }}
            className="font-medium uppercase tracking-[0.12em] text-[color:var(--accent-red)] hover:underline"
          >
            view your profile →
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-hidden border-b border-rule bg-ink text-[color:var(--cotton)]">
      <div className="mx-auto flex max-w-[1180px] items-center justify-center gap-3 px-6 py-2 font-mono text-[10px] tracking-[0.05em]">
        <span className="hidden h-1.5 w-1.5 rounded-full bg-[color:var(--accent-red)] sm:inline-block" />
        <span className="text-[color:var(--cotton)]/80">
          Sign in to publish your zine — get a public link + embed code
        </span>
        <Link
          to="/auth"
          className="font-medium uppercase tracking-[0.12em] text-[color:var(--accent-red)] hover:underline"
        >
          create a free account →
        </Link>
      </div>
    </div>
  );
}
