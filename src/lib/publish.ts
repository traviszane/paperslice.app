import { supabase } from "@/integrations/supabase/client";
import type { PhotoFile, VideoFile, AudioFile, Format, Vibe, TextShape } from "@/lib/store";

export interface PublishInput {
  userId: string;
  title: string;
  slug: string;
  format: Format;
  igRatio?: string;
  vibe: Vibe;
  textShape: TextShape;
  headerFont: string;
  bodyFont: string;
  words: string;
  photos: PhotoFile[];
  videos: VideoFile[];
  audios: AudioFile[];
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function validateSlug(s: string): string | null {
  if (!/^[a-z0-9-]{3,60}$/.test(s)) {
    return "Slug must be 3–60 chars, lowercase letters, numbers, or dashes.";
  }
  return null;
}

async function fetchAsBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  return res.blob();
}

interface UploadedAsset {
  kind: "photo" | "video" | "audio" | "text";
  name: string;
  storage_path: string | null;
  size_bytes: number;
  mime_type: string | null;
  duration_sec: number | null;
  page: number | null;
  position: number;
  text_content: string | null;
}

export async function publishZine(
  input: PublishInput,
  onProgress?: (msg: string) => void,
): Promise<{ slug: string; viewUrl: string; embedCode: string }> {
  const { userId, slug } = input;

  // 1. Insert zine row first so we have an id
  onProgress?.("Creating zine record…");
  const { data: zine, error: zineErr } = await supabase
    .from("zines")
    .insert({
      user_id: userId,
      title: input.title,
      slug,
      format: input.format,
      ig_ratio: input.igRatio ?? null,
      vibe: input.vibe,
      text_shape: input.textShape,
      header_font: input.headerFont,
      body_font: input.bodyFont,
      words: input.words,
      published: true,
      published_at: new Date().toISOString(),
    })
    .select("id, slug")
    .single();

  if (zineErr || !zine) {
    throw new Error(zineErr?.message || "Failed to create zine. The slug may already be taken.");
  }

  const zineId = zine.id;
  const folder = `${userId}/${zineId}`;
  const uploads: UploadedAsset[] = [];
  let coverPath: string | null = null;

  // 2. Upload photos
  let pos = 0;
  for (const p of input.photos) {
    onProgress?.(`Uploading photo ${pos + 1}/${input.photos.length}…`);
    const blob = await fetchAsBlob(p.url);
    const ext = (p.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${folder}/photo-${pos}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("zine-assets").upload(path, blob, {
      contentType: blob.type || "image/jpeg",
      upsert: false,
    });
    if (error) throw new Error(`Photo upload failed: ${error.message}`);
    if (!coverPath) coverPath = path;
    uploads.push({
      kind: "photo",
      name: p.name,
      storage_path: path,
      size_bytes: blob.size,
      mime_type: blob.type || null,
      duration_sec: null,
      page: null,
      position: pos++,
      text_content: null,
    });
  }

  // 3. Upload videos
  for (const v of input.videos) {
    onProgress?.(`Uploading video ${v.name}…`);
    const blob = await fetchAsBlob(v.url);
    const path = `${folder}/video-${pos}-${Date.now()}.mp4`;
    const { error } = await supabase.storage.from("zine-assets").upload(path, blob, {
      contentType: blob.type || "video/mp4",
      upsert: false,
    });
    if (error) throw new Error(`Video upload failed: ${error.message}`);
    uploads.push({
      kind: "video",
      name: v.name,
      storage_path: path,
      size_bytes: blob.size,
      mime_type: blob.type || null,
      duration_sec: v.duration ?? null,
      page: v.page ?? null,
      position: pos++,
      text_content: null,
    });
  }

  // 4. Upload audio
  for (const a of input.audios) {
    onProgress?.(`Uploading audio ${a.name}…`);
    const blob = await fetchAsBlob(a.url);
    const ext = (a.name.split(".").pop() || "mp3").toLowerCase();
    const path = `${folder}/audio-${pos}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("zine-assets").upload(path, blob, {
      contentType: blob.type || "audio/mpeg",
      upsert: false,
    });
    if (error) throw new Error(`Audio upload failed: ${error.message}`);
    uploads.push({
      kind: "audio",
      name: a.name,
      storage_path: path,
      size_bytes: blob.size,
      mime_type: blob.type || null,
      duration_sec: null,
      page: a.page ?? null,
      position: pos++,
      text_content: null,
    });
  }

  // 5. Insert text as an asset row (so it travels with the zine)
  if (input.words.trim()) {
    uploads.push({
      kind: "text",
      name: "words.txt",
      storage_path: null,
      size_bytes: new Blob([input.words]).size,
      mime_type: "text/plain",
      duration_sec: null,
      page: null,
      position: pos++,
      text_content: input.words,
    });
  }

  // 6. Insert all asset rows
  if (uploads.length) {
    onProgress?.("Saving asset metadata…");
    const { error: assetErr } = await supabase.from("assets").insert(
      uploads.map((u) => ({ ...u, zine_id: zineId, user_id: userId })),
    );
    if (assetErr) throw new Error(`Saving assets failed: ${assetErr.message}`);
  }

  // 7. Update cover path
  if (coverPath) {
    await supabase.from("zines").update({ cover_path: coverPath }).eq("id", zineId);
  }

  const viewUrl = `${window.location.origin}/zines/${zine.slug}`;
  const embedCode = `<iframe src="${viewUrl}?embed=1" width="100%" height="640" frameborder="0" allow="autoplay" style="border:1px solid #e6ddd0;background:#f0e8dc"></iframe>`;

  return { slug: zine.slug, viewUrl, embedCode };
}

export async function totalUserStorageBytes(userId: string): Promise<number> {
  const { data } = await supabase
    .from("assets")
    .select("size_bytes")
    .eq("user_id", userId);
  return (data || []).reduce((sum, r) => sum + (r.size_bytes || 0), 0);
}

export function publicAssetUrl(storagePath: string): string {
  const { data } = supabase.storage.from("zine-assets").getPublicUrl(storagePath);
  return data.publicUrl;
}
