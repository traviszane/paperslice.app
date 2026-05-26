import jsPDF from "jspdf";
import JSZip from "jszip";
import { singleSheetImposition, type ZineDoc, type ZinePage } from "./zine";
import type { Format, IGRatio } from "./store";

// ---------- helpers ----------

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawPaperBg(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#F5F0E8";
  ctx.fillRect(0, 0, w, h);
  // light grain
  for (let i = 0; i < (w * h) / 400; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.04})`;
    ctx.fillRect(x, y, 1, 1);
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

interface RenderOpts {
  headerFont: string;
  bodyFont: string;
  vibe: string;
  textShape: string;
  watermark: boolean;
}

/** Render a single zine page to a canvas. Returns the canvas. */
async function renderPageCanvas(page: ZinePage, w: number, h: number, opts: RenderOpts): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  drawPaperBg(ctx, w, h);

  // Photo
  if (page.photo) {
    try {
      const img = await loadImage(page.photo.url);
      // cover-fit
      const ar = img.width / img.height;
      const tAr = w / h;
      let sx = 0,
        sy = 0,
        sw = img.width,
        sh = img.height;
      if (ar > tAr) {
        sw = img.height * tAr;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / tAr;
        sy = (img.height - sh) / 2;
      }
      ctx.globalAlpha = page.kind === "cover" ? 0.85 : 0.75;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      ctx.globalAlpha = 1;
      if (opts.vibe === "collage") {
        ctx.filter = "grayscale(0.4) contrast(1.1)";
      }
    } catch {
      /* ignore */
    }
  }

  // Vibe overlays
  if (opts.vibe === "collage") {
    ctx.strokeStyle = "rgba(28,25,23,0.25)";
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.strokeRect(w * 0.04, h * 0.04, w * 0.92, h * 0.92);
    ctx.setLineDash([]);
  }

  // Heading
  const padX = w * 0.07;
  if (page.heading) {
    const isCover = page.kind === "cover";
    const fontSize = isCover ? Math.round(w * 0.085) : Math.round(w * 0.045);
    ctx.fillStyle = "#1A1714";
    ctx.font = `${opts.vibe === "minimal" ? "400" : "700"} ${fontSize}px "${opts.headerFont}", serif`;
    ctx.textBaseline = "top";

    const headY = isCover ? h - fontSize * 2.2 : padX;
    if (opts.textShape === "diagonal") {
      ctx.save();
      ctx.translate(padX, headY + fontSize);
      ctx.rotate((-6 * Math.PI) / 180);
      ctx.fillText(page.heading, 0, -fontSize);
      ctx.restore();
    } else if (opts.textShape === "stacked" && isCover) {
      const words = page.heading.split(/\s+/).slice(0, 4);
      let y = headY - fontSize * (words.length - 1) * 0.8;
      for (const word of words) {
        ctx.fillText(word, padX, y);
        y += fontSize * 0.85;
      }
    } else {
      const lines = wrapText(ctx, page.heading, w - padX * 2);
      let y = headY;
      for (const ln of lines) {
        if (opts.textShape === "outlined") {
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = "#1A1714";
          ctx.strokeText(ln, padX, y);
        } else {
          ctx.fillText(ln, padX, y);
        }
        y += fontSize * 1.05;
      }
    }
  }

  // Body
  if (page.body && page.kind !== "cover") {
    const fs = Math.round(w * 0.024);
    ctx.fillStyle = "rgba(28,23,20,0.78)";
    ctx.font = `${opts.vibe === "editorial" ? "italic " : ""}400 ${fs}px "${opts.bodyFont}", monospace`;
    const lines = wrapText(ctx, page.body, w - padX * 2);
    let y = page.heading ? padX + Math.round(w * 0.045) * 1.4 + 6 : padX;
    for (const ln of lines.slice(0, 22)) {
      ctx.fillText(ln, padX, y);
      y += fs * 1.55;
      if (y > h - padX - 24) break;
    }
  }

  // Cover badge
  if (page.kind === "cover") {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.font = `400 ${Math.round(w * 0.018)}px "IBM Plex Mono", monospace`;
    ctx.fillText("A PAPERSLICE ZINE", padX, h - padX);
  }

  // Watermark
  if (opts.watermark) {
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.font = `300 ${Math.round(w * 0.016)}px "IBM Plex Mono", monospace`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText("made with paperslice.app", padX, h - 8);
  }

  return canvas;
}

// ---------- PDF EXPORTS ----------

export async function exportEbookPDF(doc: ZineDoc, opts: RenderOpts) {
  const pdf = new jsPDF({ unit: "pt", format: [420, 595] }); // A5 portrait
  const W = 420;
  const H = 595;
  for (let i = 0; i < doc.pages.length; i++) {
    if (i > 0) pdf.addPage([W, H]);
    const canvas = await renderPageCanvas(doc.pages[i], 840, 1190, opts); // 2x for quality
    const img = canvas.toDataURL("image/jpeg", 0.92);
    pdf.addImage(img, "JPEG", 0, 0, W, H);
  }
  pdf.save(`${slug(doc.title)}-ebook.pdf`);
}

export async function exportPrintableZinePDF(doc: ZineDoc, opts: RenderOpts) {
  // A5 booklet - one page per PDF page (user prints duplex + staples)
  const pdf = new jsPDF({ unit: "pt", format: "a5", orientation: "portrait" });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  for (let i = 0; i < doc.pages.length; i++) {
    if (i > 0) pdf.addPage("a5", "portrait");
    const canvas = await renderPageCanvas(doc.pages[i], 840, 1190, opts);
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, W, H);
  }
  pdf.save(`${slug(doc.title)}-zine-a5.pdf`);
}

export async function exportTwoPageSpreadPDF(doc: ZineDoc, opts: RenderOpts) {
  const pdf = new jsPDF({ unit: "pt", format: [842, 595], orientation: "landscape" }); // A4 landscape
  const W = 842;
  const H = 595;
  const halfW = W / 2;
  for (let i = 0; i < doc.pages.length; i += 2) {
    if (i > 0) pdf.addPage([W, H], "landscape");
    const left = await renderPageCanvas(doc.pages[i], 840, 1190, opts);
    pdf.addImage(left.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, halfW, H);
    if (doc.pages[i + 1]) {
      const right = await renderPageCanvas(doc.pages[i + 1], 840, 1190, opts);
      pdf.addImage(right.toDataURL("image/jpeg", 0.92), "JPEG", halfW, 0, halfW, H);
    }
  }
  pdf.save(`${slug(doc.title)}-spread.pdf`);
}

export async function exportSingleSheetPDF(doc: ZineDoc, opts: RenderOpts) {
  // A4 landscape, 4x2 grid imposition
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const cellW = W / 4;
  const cellH = H / 2;

  const layout = singleSheetImposition();

  // Render each cell. For rotated cells, we render the page normally then
  // place it via rotation transform via embedding a pre-rotated canvas.
  for (const cell of layout) {
    const page = doc.pages[cell.pageIdx];
    if (!page) continue;
    // Render at cell aspect ratio (3:4 portrait per panel)
    const panelCanvas = await renderPageCanvas(page, 420, 560, opts);

    let finalCanvas = panelCanvas;
    if (cell.rotated) {
      const r = document.createElement("canvas");
      r.width = panelCanvas.width;
      r.height = panelCanvas.height;
      const rctx = r.getContext("2d")!;
      rctx.translate(r.width / 2, r.height / 2);
      rctx.rotate(Math.PI);
      rctx.drawImage(panelCanvas, -r.width / 2, -r.height / 2);
      finalCanvas = r;
    }
    const x = cell.col * cellW;
    const y = cell.row * cellH;
    pdf.addImage(finalCanvas.toDataURL("image/jpeg", 0.92), "JPEG", x, y, cellW, cellH);
  }

  // Fold/cut guide lines
  pdf.setDrawColor(150);
  pdf.setLineDashPattern([3, 3], 0);
  pdf.line(0, H / 2, W, H / 2); // horizontal fold line
  pdf.line(W / 2, H / 2 - 60, W / 2, H / 2 + 60); // center cut slit indicator
  pdf.setLineDashPattern([], 0);

  pdf.setFontSize(7);
  pdf.setTextColor(120);
  pdf.text("PAPERSLICE · fold in half, cut center slit, fold into 8-page booklet", 14, H - 8);

  pdf.save(`${slug(doc.title)}-single-sheet.pdf`);
}

// ---------- INSTAGRAM ZIP ----------

export async function exportInstagramZIP(
  doc: ZineDoc,
  ratio: IGRatio,
  audios: { id: string; name: string; url: string; page?: number }[],
  videos: { id: string; name: string; url: string; page?: number }[],
  opts: RenderOpts
) {
  const zip = new JSZip();
  const dims = ratio === "1:1" ? { w: 1080, h: 1080 } : ratio === "4:5" ? { w: 1080, h: 1350 } : { w: 1080, h: 1920 };

  for (let i = 0; i < doc.pages.length; i++) {
    const c = await renderPageCanvas(doc.pages[i], dims.w, dims.h, opts);
    const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b!), "image/png"));
    const num = String(i + 1).padStart(2, "0");
    zip.file(`slide_${num}.png`, blob);
  }

  if (audios.length) {
    const aFolder = zip.folder("audio")!;
    for (const a of audios) {
      const blob = await fetch(a.url).then((r) => r.blob());
      aFolder.file(a.name, blob);
    }
  }
  if (videos.length) {
    const vFolder = zip.folder("video")!;
    for (const v of videos) {
      const blob = await fetch(v.url).then((r) => r.blob());
      vFolder.file(v.name, blob);
    }
  }

  const readme = [
    `PAPERSLICE · ${doc.title}`,
    `Format: Instagram zine · ratio ${ratio}`,
    `Slides: ${doc.pages.length}`,
    "",
    "Slide order:",
    ...doc.pages.map((p, i) => `  slide_${String(i + 1).padStart(2, "0")}.png — ${p.label}`),
    "",
    audios.length ? "Audio attachments (play with assigned slide):" : "",
    ...audios.map((a) => `  /audio/${a.name}${a.page ? ` → slide ${a.page}` : ""}`),
    "",
    videos.length ? "Video attachments (play with assigned slide):" : "",
    ...videos.map((v) => `  /video/${v.name}${v.page ? ` → slide ${v.page}` : ""}`),
    "",
    "Generated by paperslice.app",
  ].join("\n");
  zip.file("README.txt", readme);

  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, `${slug(doc.title)}-instagram.zip`);
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "untitled";
}

export async function exportFor(
  format: Format,
  doc: ZineDoc,
  opts: RenderOpts,
  extra: { igRatio: IGRatio; audios: any[]; videos: any[] }
) {
  switch (format) {
    case "ebook":
      return exportEbookPDF(doc, opts);
    case "single-sheet":
      return exportSingleSheetPDF(doc, opts);
    case "printable-zine":
      return exportPrintableZinePDF(doc, opts);
    case "two-page":
      return exportTwoPageSpreadPDF(doc, opts);
    case "instagram":
      return exportInstagramZIP(doc, extra.igRatio, extra.audios, extra.videos, opts);
  }
}
