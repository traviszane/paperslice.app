import { useState } from "react";
import { toast } from "sonner";
import { Download, Share2, Link as LinkIcon, Check, Sparkles, FileDown } from "lucide-react";
import { useZine } from "@/lib/store";
import { buildZine } from "@/lib/zine";
import { exportFor, slug } from "@/lib/export";
import { useAuth } from "@/hooks/use-auth";
import { PublishDialog } from "./PublishDialog";

export function ExportStep() {
  const { title, format, headerFont, bodyFont, vibe, textShape, igRatio, photos, videos, audios, words, setStep } = useZine();
  const { user, profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const hasWatermark = !profile || profile.tier === "free";

  const doc = buildZine({ title, format, photos, videos, audios, words });

  const formatLabel: Record<typeof format, string> = {
    "single-sheet": "Single Sheet PDF",
    ebook: "E-book PDF",
    "printable-zine": "Printable Zine PDF (A5)",
    "two-page": "Two-Page Spread PDF",
    instagram: "Instagram ZIP (PNGs + media)",
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      await exportFor(
        format,
        doc,
        { headerFont, bodyFont, vibe, textShape, watermark: hasWatermark },
        { igRatio, audios, videos }
      );
      toast.success("Exported! Check your downloads.");
    } catch (e) {
      console.error(e);
      toast.error("Export failed. Try again?");
    } finally {
      setBusy(false);
    }
  };

  const shareUrl = `https://paperslice.app/zines/${slug(title)}`;

  const copyShare = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied — sign in to make it live");
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="grid gap-0 md:grid-cols-[1fr_360px] min-h-[calc(100vh-130px)]">
      <div className="border-b border-rule bg-card p-6 md:border-b-0 md:border-r md:p-12">
        <div className="label-xs mb-3">Ready to export</div>
        <h2 className="mb-2 font-display text-4xl font-bold leading-tight md:text-5xl">{title}</h2>
        <p className="font-serif italic text-ink-mid mb-10">
          {doc.totalPages} pages · {vibe} · {format.replace("-", " ")} {format === "instagram" && `· ${igRatio}`}
        </p>

        <div className="space-y-3">
          <ExportCard
            primary
            onClick={handleExport}
            disabled={busy}
            icon={<FileDown size={18} />}
            title={`Download ${formatLabel[format]}`}
            desc={
              format === "instagram"
                ? "ZIP with numbered PNGs, /audio, /video, and README.txt"
                : "Real PDF, properly imposed and ready to print or share"
            }
            cta={busy ? "Preparing…" : "Download"}
          />

          <ExportCard
            onClick={copyShare}
            icon={copied ? <Check size={18} /> : <LinkIcon size={18} />}
            title="Share link"
            desc={shareUrl}
            cta={copied ? "Copied" : "Copy link"}
          />

          <ExportCard
            onClick={() => setShowPublish(true)}
            icon={<Share2 size={18} />}
            title={user ? "Publish to a public URL" : "Sign in to publish"}
            desc={
              user
                ? `Get a permanent link + embed code at paperslice.app/zines/…${hasWatermark ? " (with watermark)" : ""}`
                : "Free tier publishes with a small footer. Maker / Pro remove it."
            }
            cta={user ? "Publish" : "Sign in"}
            locked={!user}
          />
        </div>

        {/* ... keep existing code (upgrade-for-more block) */}

        <div className="mt-10 border-t border-rule pt-6">
          <div className="label-xs mb-2 flex items-center gap-2">
            <Sparkles size={11} className="text-[color:var(--accent-red)]" /> upgrade for more
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Tier name="Free" price="$0" perks={["20 photos", "3 saved zines", "watermark"]} />
            <Tier name="Maker" price="$4 / mo" perks={["40 photos", "10 saved", "no watermark"]} highlight />
            <Tier name="Pro" price="$8 / mo" perks={["80 photos", "publish URL", "embed code"]} />
          </div>
        </div>
      </div>

      <aside className="bg-paper-warm p-6 md:p-7 flex flex-col gap-5">
        <div className="label-xs">What's in the file</div>
        <ul className="space-y-2 font-mono text-[11px] text-ink-mid">
          <li className="flex justify-between"><span>Pages</span><span className="text-ink">{doc.totalPages}</span></li>
          <li className="flex justify-between"><span>Photos used</span><span className="text-ink">{photos.length}</span></li>
          <li className="flex justify-between"><span>Header font</span><span className="text-ink truncate ml-2">{headerFont}</span></li>
          <li className="flex justify-between"><span>Body font</span><span className="text-ink truncate ml-2">{bodyFont}</span></li>
          <li className="flex justify-between"><span>Vibe</span><span className="text-ink">{vibe}</span></li>
          {format === "instagram" && (
            <>
              <li className="flex justify-between"><span>Audio files</span><span className="text-ink">{audios.length}</span></li>
              <li className="flex justify-between"><span>Video files</span><span className="text-ink">{videos.length}</span></li>
            </>
          )}
        </ul>

        <div className="border border-rule bg-card p-4">
          <div className="label-xs mb-2">Watermark</div>
          <p className="font-serif text-[12px] italic text-ink-mid">
            Free exports include a small "made with paperslice.app" credit in the bottom corner. Upgrade to remove it.
          </p>
        </div>

        <button
          onClick={() => setStep(3)}
          className="mt-auto border border-rule py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mid hover:bg-card"
        >
          ← Back to preview
        </button>
      </aside>
    </div>
  );
}

function ExportCard({
  icon,
  title,
  desc,
  cta,
  onClick,
  primary,
  disabled,
  locked,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta: string;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
  locked?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group flex w-full items-center gap-4 border p-4 text-left transition ${
        primary
          ? "border-[color:var(--accent-red)] bg-[color:var(--accent-red)]/5 hover:bg-[color:var(--accent-red)]/10"
          : "border-rule bg-card hover:bg-paper-warm"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <div className={`grid h-10 w-10 place-items-center border ${primary ? "border-[color:var(--accent-red)] text-[color:var(--accent-red)]" : "border-rule text-ink-mid"}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display text-[15px] font-semibold text-ink">{title}</div>
        <div className="truncate font-mono text-[10px] text-ink-light">{desc}</div>
      </div>
      <span className={`shrink-0 font-mono text-[10px] uppercase tracking-[0.15em] ${primary ? "text-[color:var(--accent-red)]" : "text-ink-mid"}`}>
        {locked ? "🔒 " : ""}{cta}
      </span>
    </button>
  );
}

function Tier({ name, price, perks, highlight }: { name: string; price: string; perks: string[]; highlight?: boolean }) {
  return (
    <div className={`border p-3 ${highlight ? "border-[color:var(--accent-red)] bg-[color:var(--accent-red)]/5" : "border-rule bg-card"}`}>
      <div className="flex items-baseline justify-between">
        <span className="font-display text-[14px] font-bold">{name}</span>
        <span className="font-mono text-[10px] text-ink-mid">{price}</span>
      </div>
      <ul className="mt-1.5 space-y-0.5 font-mono text-[9px] text-ink-light">
        {perks.map((p) => <li key={p}>· {p}</li>)}
      </ul>
    </div>
  );
}
