import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import logoFold from "@/assets/logo-fold.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Paperslice" },
      { name: "description", content: "Sign in or create a free Paperslice account to publish your zines." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, signIn, signUp, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    const fn = mode === "signin" ? signIn : signUp;
    const { error } = await fn(email.trim().toLowerCase(), password);
    setBusy(false);
    if (error) {
      setErr(error);
      return;
    }
    if (mode === "signup") {
      toast.success("Account created — check your email to confirm.");
    } else {
      toast.success("Welcome back.");
    }
  };

  return (
    <div className="grain min-h-screen bg-paper text-ink">
      <div className="mx-auto flex min-h-screen max-w-[440px] flex-col justify-center px-6 py-12">
        <Link to="/" className="mb-10 flex items-center" aria-label="Paperslice home">
          <img src={logoFold} alt="paperslice" className="h-10 w-auto" />
        </Link>

        <h1 className="font-display text-4xl tracking-tight md:text-5xl">
          {mode === "signin" ? "Welcome back." : "Make an account."}
        </h1>
        <p className="mt-2 font-serif text-[15px] italic text-ink-mid">
          {mode === "signin"
            ? "Sign in to publish, save zines, and unlock more storage."
            : "Free tier — 500MB, publish with a small footer credit."}
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="label-xs mb-1.5 block">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-rule bg-card px-3 py-2.5 font-mono text-[13px] text-ink outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="label-xs mb-1.5 block">Password</label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-rule bg-card px-3 py-2.5 font-mono text-[13px] text-ink outline-none focus:border-ink"
            />
          </div>

          {err && (
            <div className="border border-[color:var(--accent-red)] bg-[color:var(--accent-red)]/5 px-3 py-2 font-mono text-[11px] text-[color:var(--accent-red)]">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-ink py-3.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--cotton)] transition hover:bg-[color:var(--accent-red)] disabled:opacity-60"
          >
            {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setErr(null);
            setMode(mode === "signin" ? "signup" : "signin");
          }}
          className="mt-6 text-center font-mono text-[11px] text-ink-mid hover:text-ink"
        >
          {mode === "signin" ? "No account? Make one →" : "Already have an account? Sign in →"}
        </button>

        <Link
          to="/"
          className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-ink-light hover:text-ink-mid"
        >
          ← back to maker
        </Link>
      </div>
    </div>
  );
}
