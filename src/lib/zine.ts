import type { PhotoFile, VideoFile, AudioFile, Format } from "./store";

export type PageLayout =
  | "cover"
  | "back"
  | "photo-bleed"      // full-bleed photo
  | "photo-card"       // photo on tinted bg with whitespace
  | "photo-polaroid"   // small photo with caption + tape
  | "photo-duo"        // two stacked thumbnails on tinted bg
  | "text-only"        // big quote on tinted bg
  | "text-pullquote"   // small pullquote with rule
  | "empty"            // intentional whitespace / paper texture
  | "video";

export interface ZinePage {
  index: number;
  label: string;
  layout: PageLayout;
  kind: "cover" | "content" | "back";
  photo?: PhotoFile;
  photoB?: PhotoFile;
  video?: VideoFile;
  audio?: AudioFile;
  heading?: string;
  body?: string;
  /** Pick from palette tokens: clay / sage / sky / blush / lavender / butter / cotton / paper-warm */
  bgToken?: string;
}

export interface ZineDoc {
  title: string;
  pages: ZinePage[];
  totalPages: number;
}

function pageCountFor(format: Format): number {
  switch (format) {
    case "single-sheet":
    case "printable-zine":
      return 8;
    case "two-page":
      return 2;
    case "instagram":
      return 12;
    case "ebook":
    default:
      return 12;
  }
}

function splitParagraphs(words: string): string[] {
  return words
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function pickHeading(p: string): { heading?: string; body: string } {
  const m = p.match(/^([^.!?\n]{4,70}[.!?])/);
  if (!m) return { body: p };
  return { heading: m[1].replace(/[.!?]$/, ""), body: p.slice(m[0].length).trim() };
}

const PALETTES: Record<string, string[]> = {
  grain:      ["paper", "paper-warm", "paper-deep", "cotton"],
  editorial:  ["cotton", "paper", "paper-warm"],
  collage:    ["clay", "butter", "sky", "blush", "sage", "lavender"],
  typewriter: ["paper", "cotton", "paper-warm"],
  minimal:    ["cotton", "paper"],
  colorful:   ["clay", "sage", "sky", "blush", "lavender", "butter"],
};

export function buildZine(args: {
  title: string;
  format: Format;
  vibe?: string;
  photos: PhotoFile[];
  videos: VideoFile[];
  audios: AudioFile[];
  words: string;
}): ZineDoc {
  const total = pageCountFor(args.format);
  const palette = PALETTES[args.vibe ?? "grain"] ?? PALETTES.grain;
  const paras = splitParagraphs(args.words);
  const pages: ZinePage[] = [];

  // Determine roles for each interior page (1..total-2)
  const interior = total - 2;
  const photos = args.photos;
  const photoCount = photos.length;
  const wantText = paras.length;

  // Build a sequence: alternate photo and text-style pages, drop in empties for breathing room
  const slots: PageLayout[] = [];
  let pi = 0; // photo index
  let ti = 0; // text index
  for (let i = 0; i < interior; i++) {
    const cycle = i % 5;
    if (photoCount > 0 && (cycle === 0 || cycle === 3)) {
      // Vary photo layout
      const variants: PageLayout[] = ["photo-bleed", "photo-card", "photo-polaroid", "photo-duo"];
      const variant = variants[pi % variants.length];
      // Need at least 2 photos for duo
      slots.push(variant === "photo-duo" && photoCount < 2 ? "photo-card" : variant);
      pi++;
    } else if (wantText > 0 && (cycle === 1 || cycle === 4)) {
      slots.push(ti % 2 === 0 ? "text-only" : "text-pullquote");
      ti++;
    } else if (photoCount > 0) {
      slots.push("photo-card");
      pi++;
    } else if (wantText > 0) {
      slots.push("text-only");
      ti++;
    } else {
      slots.push("empty");
    }
  }

  // Insert empties — every 4th page becomes empty if we have enough other content
  if (interior >= 5) {
    for (let i = 3; i < interior; i += 4) {
      if (slots[i] !== "empty") slots[i] = "empty";
    }
  }

  for (let i = 0; i < total; i++) {
    const isCover = i === 0;
    const isBack = i === total - 1;
    const interiorIdx = i - 1;
    const layout: PageLayout = isCover ? "cover" : isBack ? "back" : slots[interiorIdx];
    const bgToken = palette[i % palette.length];

    let photo: PhotoFile | undefined;
    let photoB: PhotoFile | undefined;
    if (isCover && photoCount > 0) photo = photos[0];
    else if (layout.startsWith("photo")) {
      photo = photos[(interiorIdx + 1) % photoCount];
      if (layout === "photo-duo" && photoCount > 1) photoB = photos[(interiorIdx + 2) % photoCount];
    }

    let heading: string | undefined;
    let body: string | undefined;
    if (isCover) {
      heading = args.title;
    } else if (isBack) {
      heading = "fin.";
    } else if (layout === "text-only" || layout === "text-pullquote" || layout === "photo-card") {
      const p = paras[ti > 0 ? (interiorIdx % paras.length) : 0];
      if (p) {
        const parsed = pickHeading(p);
        heading = layout === "text-only" ? parsed.heading : undefined;
        body = parsed.body || p;
      }
    }

    const videoForPage = args.videos.find((v) => v.page === i + 1);
    const audioForPage = args.audios.find((a) => a.page === i + 1);

    pages.push({
      index: i,
      label: isCover ? "Cover" : isBack ? "Back" : `p.${i + 1}`,
      layout: videoForPage ? "video" : layout,
      kind: isCover ? "cover" : isBack ? "back" : "content",
      photo,
      photoB,
      video: videoForPage,
      audio: audioForPage,
      heading,
      body,
      bgToken,
    });
  }

  return { title: args.title, pages, totalPages: total };
}

export function singleSheetImposition(): { row: 0 | 1; col: 0 | 1 | 2 | 3; pageIdx: number; rotated: boolean }[] {
  return [
    { row: 0, col: 0, pageIdx: 4, rotated: true },
    { row: 0, col: 1, pageIdx: 3, rotated: true },
    { row: 0, col: 2, pageIdx: 2, rotated: true },
    { row: 0, col: 3, pageIdx: 1, rotated: true },
    { row: 1, col: 0, pageIdx: 5, rotated: false },
    { row: 1, col: 1, pageIdx: 6, rotated: false },
    { row: 1, col: 2, pageIdx: 7, rotated: false },
    { row: 1, col: 3, pageIdx: 0, rotated: false },
  ];
}
