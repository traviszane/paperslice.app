import type { PhotoFile, VideoFile, AudioFile, Format } from "./store";

export type PageLayout =
  | "cover"
  | "back"
  | "photo-bleed"
  | "photo-card"
  | "photo-polaroid"
  | "photo-duo"
  | "photo-tiny"        // small photo on big colored field
  | "photo-bordered"    // thick colored border around photo
  | "text-only"
  | "text-pullquote"
  | "text-block"        // typewriter-style text block
  | "color-block"       // solid color page w/ tiny label
  | "empty"
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
  bgToken?: string;
  /** vibe-specific decoration: tape, frame color, rotation deg, photo filter */
  rotate?: number;
  frameColor?: string;
  photoFilter?: string;
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
  return words.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

function pickHeading(p: string): { heading?: string; body: string } {
  const m = p.match(/^([^.!?\n]{4,70}[.!?])/);
  if (!m) return { body: p };
  return { heading: m[1].replace(/[.!?]$/, ""), body: p.slice(m[0].length).trim() };
}

/* ============================================================
 * VIBE RECIPES — each vibe is a fundamentally different aesthetic
 * ============================================================ */
interface VibeRecipe {
  palette: string[];
  photoLayouts: PageLayout[];
  textLayouts: PageLayout[];
  fillers: PageLayout[];
  photoFilter?: string;
  rotateRange: number;       // max abs rotation deg for non-bleed photos
  frameColors?: string[];    // for bordered/polaroid frames
  emptyEvery?: number;       // insert empties to give breathing room
}

const VIBES: Record<string, VibeRecipe> = {
  grain: {
    palette: ["paper", "paper-warm", "cotton", "paper-deep"],
    photoLayouts: ["photo-bleed", "photo-card", "photo-bleed", "photo-duo"],
    textLayouts: ["text-only", "text-pullquote"],
    fillers: ["empty"],
    photoFilter: "sepia(0.18) contrast(0.95) saturate(0.85)",
    rotateRange: 0,
    emptyEvery: 5,
  },
  editorial: {
    palette: ["cotton", "paper", "cotton", "paper-warm"],
    photoLayouts: ["photo-card", "photo-bleed", "photo-card"],
    textLayouts: ["text-pullquote", "text-only"],
    fillers: ["empty"],
    rotateRange: 0,
    emptyEvery: 4,
  },
  collage: {
    palette: ["clay", "sage", "sky", "blush", "lavender", "butter"],
    photoLayouts: ["photo-polaroid", "photo-bordered", "photo-duo", "photo-polaroid", "photo-tiny"],
    textLayouts: ["text-only", "text-pullquote"],
    fillers: ["color-block"],
    rotateRange: 5,
    frameColors: ["var(--cotton)", "var(--butter)", "var(--blush)", "var(--sky)"],
    emptyEvery: 6,
  },
  typewriter: {
    palette: ["paper", "cotton", "paper"],
    photoLayouts: ["photo-card", "photo-tiny", "photo-card"],
    textLayouts: ["text-block", "text-block", "text-pullquote"],
    fillers: ["empty"],
    photoFilter: "grayscale(1) contrast(1.05)",
    rotateRange: 0,
    emptyEvery: 6,
  },
  minimal: {
    palette: ["cotton", "cotton", "paper", "cotton"],
    photoLayouts: ["photo-tiny", "photo-card", "photo-tiny"],
    textLayouts: ["text-pullquote"],
    fillers: ["empty", "empty", "color-block"],
    rotateRange: 0,
    emptyEvery: 3,
  },
  colorful: {
    palette: ["clay", "sky", "sage", "butter", "blush", "lavender"],
    photoLayouts: ["photo-bordered", "photo-tiny", "photo-bleed", "photo-bordered", "photo-duo"],
    textLayouts: ["text-only", "text-only", "text-pullquote"],
    fillers: ["color-block", "color-block"],
    rotateRange: 3,
    frameColors: ["var(--clay)", "var(--sky)", "var(--sage)", "var(--butter)", "var(--blush)", "var(--lavender)"],
    emptyEvery: 99,
  },
};

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

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
  const recipe = VIBES[args.vibe ?? "grain"] ?? VIBES.grain;
  const paras = splitParagraphs(args.words);
  const photos = args.photos;
  const photoCount = photos.length;

  const interior = Math.max(0, total - 2);
  const slots: PageLayout[] = [];
  let pi = 0;
  let ti = 0;

  for (let i = 0; i < interior; i++) {
    const cycle = i % 5;
    if (photoCount > 0 && (cycle === 0 || cycle === 2 || cycle === 4)) {
      let variant = pick(recipe.photoLayouts, pi);
      if (variant === "photo-duo" && photoCount < 2) variant = "photo-card";
      slots.push(variant);
      pi++;
    } else if (paras.length > 0 && (cycle === 1 || cycle === 3)) {
      slots.push(pick(recipe.textLayouts, ti));
      ti++;
    } else if (photoCount > 0) {
      slots.push(pick(recipe.photoLayouts, pi));
      pi++;
    } else if (paras.length > 0) {
      slots.push(pick(recipe.textLayouts, ti));
      ti++;
    } else {
      slots.push(pick(recipe.fillers, i));
    }
  }

  // Sprinkle in fillers per recipe.emptyEvery
  if (recipe.emptyEvery && interior >= recipe.emptyEvery) {
    for (let i = recipe.emptyEvery - 1; i < interior; i += recipe.emptyEvery) {
      slots[i] = pick(recipe.fillers, i);
    }
  }

  const pages: ZinePage[] = [];
  let photoCursor = 0;
  const nextPhoto = () => {
    if (photoCount === 0) return undefined;
    const p = photos[photoCursor % photoCount];
    photoCursor++;
    return p;
  };

  for (let i = 0; i < total; i++) {
    const isCover = i === 0;
    const isBack = i === total - 1;
    const interiorIdx = i - 1;
    const layout: PageLayout = isCover ? "cover" : isBack ? "back" : slots[interiorIdx];
    const bgToken = pick(recipe.palette, i);

    let photo: PhotoFile | undefined;
    let photoB: PhotoFile | undefined;
    if (isCover && photoCount > 0) photo = photos[0];
    else if (layout.startsWith("photo")) {
      photo = nextPhoto();
      if (layout === "photo-duo" && photoCount > 1) photoB = nextPhoto();
    }

    let heading: string | undefined;
    let body: string | undefined;
    if (isCover) {
      heading = args.title;
    } else if (isBack) {
      heading = "fin.";
    } else if (
      layout === "text-only" ||
      layout === "text-pullquote" ||
      layout === "text-block" ||
      layout === "photo-card" ||
      layout === "photo-bordered"
    ) {
      const p = paras[interiorIdx % Math.max(paras.length, 1)];
      if (p) {
        const parsed = pickHeading(p);
        heading = parsed.heading;
        body = parsed.body || p;
      }
    }

    const videoForPage = args.videos.find((v) => v.page === i + 1);
    const audioForPage = args.audios.find((a) => a.page === i + 1);

    const rotate = recipe.rotateRange
      ? (((i * 37) % (recipe.rotateRange * 2 + 1)) - recipe.rotateRange)
      : 0;
    const frameColor = recipe.frameColors
      ? recipe.frameColors[i % recipe.frameColors.length]
      : undefined;

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
      rotate,
      frameColor,
      photoFilter: recipe.photoFilter,
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
