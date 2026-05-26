import { create } from "zustand";

export type PhotoFile = { id: string; name: string; url: string; size: number };
export type VideoFile = { id: string; name: string; url: string; size: number; duration?: number; page?: number };
export type AudioFile = { id: string; name: string; url: string; size: number; page?: number };

export type Format = "single-sheet" | "ebook" | "printable-zine" | "two-page" | "instagram";
export type IGRatio = "1:1" | "4:5" | "9:16";
export type TextShape = "normal" | "wavy" | "circle" | "diagonal" | "stacked" | "scattered" | "outlined" | "arc";
export type Vibe = "grain" | "editorial" | "collage" | "typewriter" | "minimal" | "colorful";
export type SpacingMode = "tight" | "balanced" | "full";
export type Step = 1 | 2 | 3 | 4;

export const HEADER_FONTS = [
  "Playfair Display",
  "Bebas Neue",
  "DM Serif Display",
  "Abril Fatface",
  "Cormorant Garamond",
  "Josefin Sans",
  "Libre Baskerville",
] as const;

export const BODY_FONTS = [
  "IBM Plex Mono",
  "Lora",
  "Source Serif 4",
  "Space Mono",
  "Courier Prime",
  "Karla",
  "Merriweather",
] as const;

/** Format-aware page count configuration. */
export function pageCountConfig(format: Format): {
  fixed: boolean;
  min: number;
  max: number;
  step: number;
  default: number;
  note?: string;
} {
  switch (format) {
    case "single-sheet":
      return { fixed: true, min: 8, max: 8, step: 1, default: 8, note: "Single sheet zines are always 8 panels" };
    case "two-page":
      return { fixed: true, min: 2, max: 2, step: 1, default: 2, note: "Two-page spreads are always 2 pages" };
    case "ebook":
      return { fixed: false, min: 4, max: 40, step: 1, default: 12 };
    case "printable-zine":
      return { fixed: false, min: 8, max: 48, step: 4, default: 16, note: "Multiples of 4 for booklet printing" };
    case "instagram":
      return { fixed: false, min: 3, max: 20, step: 1, default: 10 };
  }
}

interface State {
  step: Step;
  theme: "light" | "dark";
  title: string;
  photos: PhotoFile[];
  videos: VideoFile[];
  audios: AudioFile[];
  words: string;
  format: Format;
  igRatio: IGRatio;
  pageCount: number;
  spacingMode: SpacingMode;
  pageSpacings: number[] | null;
  headerFont: string;
  bodyFont: string;
  textShape: TextShape;
  vibe: Vibe;
  generated: boolean;
  setStep: (s: Step) => void;
  toggleTheme: () => void;
  setTheme: (t: "light" | "dark") => void;
  setTitle: (t: string) => void;
  addPhotos: (files: PhotoFile[]) => void;
  removePhoto: (id: string) => void;
  clearPhotos: () => void;
  addVideos: (files: VideoFile[]) => void;
  removeVideo: (id: string) => void;
  clearVideos: () => void;
  setVideoPage: (id: string, page: number | undefined) => void;
  addAudios: (files: AudioFile[]) => void;
  removeAudio: (id: string) => void;
  clearAudios: () => void;
  setAudioPage: (id: string, page: number | undefined) => void;
  setWords: (w: string) => void;
  clearWords: () => void;
  setFormat: (f: Format) => void;
  setIGRatio: (r: IGRatio) => void;
  setPageCount: (n: number) => void;
  setSpacingMode: (m: SpacingMode) => void;
  setPageSpacings: (s: number[] | null) => void;
  setHeaderFont: (f: string) => void;
  setBodyFont: (f: string) => void;
  setTextShape: (s: TextShape) => void;
  setVibe: (v: Vibe) => void;
  setGenerated: (g: boolean) => void;
  reset: () => void;
}

export const useZine = create<State>((set) => ({
  step: 1,
  theme: "light",
  title: "Untitled Zine",
  photos: [],
  videos: [],
  audios: [],
  words: "",
  format: "single-sheet",
  igRatio: "1:1",
  pageCount: 8,
  spacingMode: "balanced",
  pageSpacings: null,
  headerFont: "Playfair Display",
  bodyFont: "IBM Plex Mono",
  textShape: "normal",
  vibe: "grain",
  generated: false,
  setStep: (step) => set({ step }),
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "light" ? "dark" : "light";
      if (typeof document !== "undefined") document.documentElement.classList.toggle("dark", next === "dark");
      return { theme: next };
    }),
  setTheme: (t) =>
    set(() => {
      if (typeof document !== "undefined") document.documentElement.classList.toggle("dark", t === "dark");
      return { theme: t };
    }),
  setTitle: (title) => set({ title }),
  addPhotos: (files) => set((s) => ({ photos: [...s.photos, ...files].slice(0, 20) })),
  removePhoto: (id) => set((s) => ({ photos: s.photos.filter((p) => p.id !== id) })),
  clearPhotos: () => set({ photos: [] }),
  addVideos: (files) => set((s) => ({ videos: [...s.videos, ...files].slice(0, 3) })),
  removeVideo: (id) => set((s) => ({ videos: s.videos.filter((v) => v.id !== id) })),
  clearVideos: () => set({ videos: [] }),
  setVideoPage: (id, page) => set((s) => ({ videos: s.videos.map((v) => (v.id === id ? { ...v, page } : v)) })),
  addAudios: (files) => set((s) => ({ audios: [...s.audios, ...files].slice(0, 3) })),
  removeAudio: (id) => set((s) => ({ audios: s.audios.filter((a) => a.id !== id) })),
  clearAudios: () => set({ audios: [] }),
  setAudioPage: (id, page) => set((s) => ({ audios: s.audios.map((a) => (a.id === id ? { ...a, page } : a)) })),
  setWords: (words) => set({ words }),
  clearWords: () => set({ words: "" }),
  setFormat: (format) =>
    set(() => {
      const cfg = pageCountConfig(format);
      return { format, pageCount: cfg.default, pageSpacings: null };
    }),
  setIGRatio: (igRatio) => set({ igRatio }),
  setPageCount: (pageCount) => set({ pageCount, pageSpacings: null }),
  setSpacingMode: (spacingMode) => set({ spacingMode, pageSpacings: null }),
  setPageSpacings: (pageSpacings) => set({ pageSpacings }),
  setHeaderFont: (headerFont) => set({ headerFont }),
  setBodyFont: (bodyFont) => set({ bodyFont }),
  setTextShape: (textShape) => set({ textShape }),
  setVibe: (vibe) => set({ vibe }),
  setGenerated: (generated) => set({ generated }),
  reset: () =>
    set({
      step: 1,
      photos: [],
      videos: [],
      audios: [],
      words: "",
      generated: false,
      pageSpacings: null,
    }),
}));
