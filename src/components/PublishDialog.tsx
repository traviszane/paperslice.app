import { useState, useEffect } from "react";
import { Link as LinkIcon, Check, X, Copy, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { useZine } from "@/lib/store";
import { useAuth, TIER_BYTES, TIER_LABEL } from "@/hooks/use-auth";
import { publishZine, slugify, validateSlug, totalUserStorageBytes } from "@/lib/publish";

export function PublishDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, profile } = useAuth();
  const zine = useZine();
  const [slug, setSlug] = useState(() => slugify(zine.title || "untitled-zine"));
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ viewUrl: string; embedCode: string } | null>(null);
  const [copied, setCopied] = useState<"url" | "embed" | null>(null);
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);

  useEffect(() => {
    if (!open || !user || !profile) return;
    setSlug(slugify(zine.title || "untitled-zine"));
    setErr(null);
    setResult(null);
    setProgress("");
    totalUserStorageBytes(user.id).then((used) =>
      setUsage({ used, limit: TIER_BYTES[profile.tier] }),
    );
  }, [open, user, profile, zine.title]);

  if (!open) return null;

  if (!user || !profile) {
    return (
      <Backdrop onClose={onClose}>
        <h2 className="font-display text-3xl">Sign in to publish</h2>
        <p className="mt-2 font-serif italic text-ink-mid">
          You need an account to give your zine a public URL.
        </p>
        <div className="mt-6 flex gap-2">
          <Link
            to="/auth"
            className="flex-1 bg-ink py-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--paper)] hover:bg-[color:var(--accent-red)]"
          >
            Sign in / sign up
          </Link>
          <button
            onClick={onClose}
            className="border border-rule px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mid hover:bg-paper-warm"
          >
            Cancel
          </button>
        </div>
      </Backdrop>
    );
  }

  // Compute pending size from current zine media (rough — actual upload uses blob.size)
  const pendingBytes =
    zine.photos.reduce((s, p) => s + p.size, 0) +
    zine.videos.reduce((s, v) => s + v.size, 0) +
    zine.audios.reduce((s, a) => s + a.size, 0);
  const wouldExceed = usage ? usage.used + pendingBytes > usage.limit : false;

  const handlePublish = async () => {
    setErr(null);
    const validationErr = validateSlug(slug);
    if (validationErr) {
      setErr(validationErr);
      return;
    }
    if (wouldExceed) {
      setErr(`This zine would put you over your ${TIER_LABEL[profile.tier]} tier limit. Upgrade or remove some media.`);
      return;
    }
    setBusy(true);
    try {
      const r = await publishZine(
        {
          userId: user.id,
          title: zine.title,
          slug,
          format: zine.format,
          igRatio: zine.format === "instagram" ? zine.igRatio : undefined,
          vibe: zine.vibe,
          textShape: zine.textShape,
          headerFont: zine.headerFont,
          bodyFont: zine.bodyFont,
          words: zine.words,
          photos: zine.photos,
          videos: zine.videos,
          audios: zine.audios,
        },
        setProgress,
      );
      setResult({ viewUrl: r.viewUrl, embedCode: r.embedCode });
      toast.success("Published.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Publish failed.";
      setErr(msg);
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const copy = (text: string, which: "url" | "embed") => {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1800);
  };

  if (result) {
    return (
      <Backdrop onClose={onClose}>
        <div className="label-xs mb-2 text-[color:var(--accent-red)]">published</div>
        <h2 className="font-display text-4xl leading-tight">Your zine is live.</h2>

        <div className="mt-6 space-y-3">
          <div className="border border-rule bg-paper-warm p-3">
            <div className="label-xs mb-1.5 flex items-center gap-1.5">
              <LinkIcon size={11} /> public url
            </div>
            <div className="flex items-center gap-2">
              <a
                href={result.viewUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 truncate font-mono text-[12px] text-ink hover:underline"
              >
                {result.viewUrl}
              </a>
              <button
                onClick={() => copy(result.viewUrl, "url")}
                className="grid h-8 w-8 place-items-center border border-rule bg-card text-ink-mid hover:bg-paper-deep"
                aria-label="Copy URL"
              >
                {copied === "url" ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          <div className="border border-rule bg-paper-warm p-3">
            <div className="label-xs mb-1.5">embed code</div>
            <div className="flex items-start gap-2">
              <code className="flex-1 break-all rounded-sm bg-card p-2 font-mono text-[10px] text-ink-mid">
                {result.embedCode}
              </code>
              <button
                onClick={() => copy(result.embedCode, "embed")}
                className="grid h-8 w-8 shrink-0 place-items-center border border-rule bg-card text-ink-mid hover:bg-paper-deep"
                aria-label="Copy embed code"
              >
                {copied === "embed" ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <a
            href={result.viewUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 bg-ink py-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--paper)] hover:bg-[color:var(--accent-red)]"
          >
            View zine →
          </a>
          <button
            onClick={onClose}
            className="border border-rule px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mid hover:bg-paper-warm"
          >
            Close
          </button>
        </div>
      </Backdrop>
    );
  }

  return (
    <Backdrop onClose={busy ? undefined : onClose}>
      <div className="label-xs mb-2">publish zine</div>
      <h2 className="font-display text-3xl leading-tight">Pick a URL for your zine.</h2>

      <div className="mt-5">
        <label className="label-xs mb-1.5 block">slug</label>
        <div className="flex items-stretch border border-rule bg-card">
          <span className="grid place-items-center bg-paper-warm px-3 font-mono text-[11px] text-ink-light">
            paperslice.app/zines/
          </span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            disabled={busy}
            className="flex-1 bg-transparent px-3 py-2.5 font-mono text-[13px] text-ink outline-none"
            placeholder="my-zine"
          />
        </div>
        <p className="mt-2 font-mono text-[10px] text-ink-light">
          3–60 chars, lowercase letters, numbers, and dashes only.
        </p>
      </div>

      {usage && (
        <div className="mt-5 border border-rule bg-paper-warm p-3">
          <div className="flex items-center justify-between font-mono text-[10px] text-ink-mid">
            <span>storage used</span>
            <span className={wouldExceed ? "text-[color:var(--accent-red)]" : ""}>
              {fmtBytes(usage.used)} + {fmtBytes(pendingBytes)} / {fmtBytes(usage.limit)}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-deep">
            <div
              className={`h-full transition-all ${wouldExceed ? "bg-[color:var(--accent-red)]" : "bg-ink"}`}
              style={{ width: `${Math.min(100, ((usage.used + pendingBytes) / usage.limit) * 100)}%` }}
            />
          </div>
          {profile.tier === "free" && (
            <p className="mt-2 font-mono text-[10px] text-ink-light">
              Your zine will include a small "made with paperslice.app" footer.{" "}
              <button className="text-[color:var(--accent-red)] underline" type="button">
                upgrade to remove
              </button>
            </p>
          )}
        </div>
      )}

      {err && (
        <div className="mt-4 flex items-start gap-2 border border-[color:var(--accent-red)] bg-[color:var(--accent-red)]/5 px-3 py-2 font-mono text-[11px] text-[color:var(--accent-red)]">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {busy && (
        <div className="mt-4 flex items-center gap-2 font-mono text-[11px] text-ink-mid">
          <Loader2 size={13} className="animate-spin" />
          {progress || "Publishing…"}
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <button
          onClick={handlePublish}
          disabled={busy || wouldExceed}
          className="flex-1 bg-ink py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--paper)] hover:bg-[color:var(--accent-red)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Publishing…" : "Publish"}
        </button>
        <button
          onClick={onClose}
          disabled={busy}
          className="border border-rule px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mid hover:bg-paper-warm disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </Backdrop>
  );
}

function Backdrop({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md border border-ink bg-card p-6 shadow-2xl md:p-7">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute right-3 top-3 grid h-7 w-7 place-items-center text-ink-light hover:bg-paper-warm hover:text-ink"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
