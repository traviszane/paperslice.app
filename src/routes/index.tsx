import { createFileRoute } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { useZine } from "@/lib/store";
import { Topbar, PublishBanner } from "@/components/Topbar";
import { UploadStep } from "@/components/UploadStep";
import { FormatStep } from "@/components/FormatStep";
import { GenerateStep } from "@/components/GenerateStep";
import { ExportStep } from "@/components/ExportStep";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Paperslice — make a zine in four steps" },
      {
        name: "description",
        content:
          "Upload photos, video, words, and audio. Slice them into a real zine — single sheet, printable, e-book, spread, or Instagram slides. Independent, crafty, free to start.",
      },
      { property: "og:title", content: "Paperslice — make a zine" },
      { property: "og:description", content: "Cut-and-paste zine maker. Real PDFs, real downloads, no fuss." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: IndexPage,
});

function IndexPage() {
  const step = useZine((s) => s.step);

  return (
    <div className="grain min-h-screen bg-paper text-ink">
      <Topbar />
      <PublishBanner />
      <main>
        {step === 1 && <UploadStep />}
        {step === 2 && <FormatStep />}
        {step === 3 && <GenerateStep />}
        {step === 4 && <ExportStep />}
      </main>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--ink)",
            color: "var(--paper)",
            border: "1px solid var(--rule)",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            borderRadius: "0",
          },
        }}
      />
    </div>
  );
}
