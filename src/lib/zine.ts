import type { PhotoFile, VideoFile, AudioFile, Format } from "./store";

export interface ZinePage {
  index: number; // 0-based
  label: string; // "Cover", "p.2", "Back", etc.
  kind: "cover" | "content" | "back";
  photo?: PhotoFile;
  video?: VideoFile;
  audio?: AudioFile;
  heading?: string;
  body?: string;
}

export interface ZineDoc {
  title: string;
  pages: ZinePage[];
  totalPages: number;
}

function pageCountFor(format: Format): number {
  switch (format) {
    case "single-sheet":
      return 8;
    case "printable-zine":
      return 8;
    case "two-page":
      return 2;
    case "instagram":
      return 20;
    case "ebook":
    default:
      return 12;
  }
}

function splitWords(words: string, contentSlots: number): { heading?: string; body: string }[] {
  if (!words.trim()) return Array(contentSlots).fill({ body: "" });
  const paras = words
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paras.length === 0) return Array(contentSlots).fill({ body: "" });

  // Distribute paragraphs across slots
  const out: { heading?: string; body: string }[] = [];
  for (let i = 0; i < contentSlots; i++) {
    const p = paras[i % paras.length];
    // First sentence as heading if short
    const firstSentenceMatch = p.match(/^([^.!?\n]{4,60}[.!?])/);
    const heading = i < paras.length && firstSentenceMatch ? firstSentenceMatch[1].replace(/[.!?]$/, "") : undefined;
    const body = heading ? p.slice(firstSentenceMatch![0].length).trim() : p;
    out.push({ heading, body });
  }
  return out;
}

export function buildZine(args: {
  title: string;
  format: Format;
  photos: PhotoFile[];
  videos: VideoFile[];
  audios: AudioFile[];
  words: string;
}): ZineDoc {
  const total = pageCountFor(args.format);
  const pages: ZinePage[] = [];
  const contentSlots = total - 2; // cover + back
  const texts = splitWords(args.words, contentSlots);

  for (let i = 0; i < total; i++) {
    const isCover = i === 0;
    const isBack = i === total - 1;
    let label = "p." + (i + 1);
    let kind: ZinePage["kind"] = "content";
    if (isCover) {
      label = "Cover";
      kind = "cover";
    } else if (isBack) {
      label = "Back";
      kind = "back";
    }

    const photo = args.photos[i % Math.max(args.photos.length, 1)] || undefined;
    const videoForPage = args.videos.find((v) => v.page === i + 1);
    const audioForPage = args.audios.find((a) => a.page === i + 1);
    const text = isCover ? { heading: args.title, body: "" } : isBack ? { heading: "made with paperslice", body: "" } : texts[i - 1];

    pages.push({
      index: i,
      label,
      kind,
      photo: args.photos.length ? photo : undefined,
      video: videoForPage,
      audio: audioForPage,
      heading: text?.heading,
      body: text?.body,
    });
  }

  return { title: args.title, pages, totalPages: total };
}

/**
 * Single-sheet 8-panel imposition.
 * Returns layout for the printed FRONT side of a single A4/Letter sheet.
 * After printing, fold in half (long way), cut center slit, fold so panels stack
 * in reading order: cover → p.2 → p.3 → p.4 → p.5 → p.6 → p.7 → back.
 *
 * Standard 8-page mini-zine imposition (front side, single-sided print):
 *   Top row (printed upside down):    p.5 | p.4 | p.3 | p.2
 *   Bottom row (right-side up):       p.6 | p.7 | back | cover
 *
 * (Index into zine pages 1-8 where 1=cover, 8=back)
 */
export function singleSheetImposition(): { row: 0 | 1; col: 0 | 1 | 2 | 3; pageIdx: number; rotated: boolean }[] {
  // pageIdx is 0-based into ZineDoc.pages
  return [
    // Top row, rotated 180
    { row: 0, col: 0, pageIdx: 4, rotated: true }, // p.5
    { row: 0, col: 1, pageIdx: 3, rotated: true }, // p.4
    { row: 0, col: 2, pageIdx: 2, rotated: true }, // p.3
    { row: 0, col: 3, pageIdx: 1, rotated: true }, // p.2
    // Bottom row
    { row: 1, col: 0, pageIdx: 5, rotated: false }, // p.6
    { row: 1, col: 1, pageIdx: 6, rotated: false }, // p.7
    { row: 1, col: 2, pageIdx: 7, rotated: false }, // back
    { row: 1, col: 3, pageIdx: 0, rotated: false }, // cover
  ];
}
