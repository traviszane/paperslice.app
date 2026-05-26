import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { publicAssetUrl } from "@/lib/publish";
import logoFold from "@/assets/logo-fold.png";

interface ZineAsset {
  id: string;
  kind: "photo" | "video" | "audio" | "text";
  name: string;
  storage_path: string | null;
  page: number | null;
  position: number;
  duration_sec: number | null;
  text_content: string | null;
}

interface ZineRow {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  format: string;
  vibe: string;
  header_font: string;
  body_font: string;
  text_shape: string;
  words: string;
  cover_path: string | null;
  view_count: number;
  published_at: string | null;
  assets: ZineAsset[];
  profile: { username: string; display_name: string | null; tier: string } | null;
}

async function loadZine(slug: string): Promise<ZineRow> {
  const { data: zine, error } = await supabase
    .from("zines")
    .select(
      "id, user_id, title, slug, format, vibe, header_font, body_font, text_shape, words, cover_path, view_count, published_at",
    )
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error || !zine || !zine.slug) throw notFound();

  const [{ data: assetRows }, { data: profile }] = await Promise.all([
    supabase
      .from("assets")
      .select("id, kind, name, storage_path, page, position, duration_sec, text_content")
      .eq("zine_id", zine.id)
      .order("position", { ascending: true }),
    supabase
      .from("profiles")
      .select("username, display_name, tier")
      .eq("id", zine.user_id)
      .maybeSingle(),
  ]);

  const assets: ZineAsset[] = (assetRows ?? []).map((a) => ({
    id: a.id,
    kind: a.kind as ZineAsset["kind"],
    name: a.name,
    storage_path: a.storage_path,
    page: a.page,
    position: a.position,
    duration_sec: a.duration_sec,
    text_content: a.text_content,
  }));

  return {
    ...zine,
    slug: zine.slug,
    assets,
    profile: profile ?? null,
  };
}

export const Route = createFileRoute("/zines/$slug")({
  loader: async ({ params }) => loadZine(params.slug),
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} — Paperslice` },
          { name: "description", content: `A zine by @${loaderData.profile?.username ?? "anon"} on Paperslice.` },
          { property: "og:title", content: loaderData.title },
          {
            property: "og:description",
            content: `A zine by @${loaderData.profile?.username ?? "anon"}`,
          },
          ...(loaderData.cover_path
            ? [{ property: "og:image", content: publicAssetUrl(loaderData.cover_path) }]
            : []),
          { property: "og:type", content: "article" },
          { name: "twitter:card", content: "summary_large_image" },
        ]
      : [{ title: "Zine — Paperslice" }],
  }),
  notFoundComponent: () => (
    <div className="grain grid min-h-screen place-items-center bg-paper p-6 text-center">
      <div>
        <h1 className="font-display text-5xl">This zine doesn't exist.</h1>
        <p className="mt-2 font-serif italic text-ink-mid">Or it hasn't been published yet.</p>
        <Link
          to="/"
          className="mt-6 inline-block border border-ink px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-ink hover:text-[color:var(--cotton)]"
        >
          ← back to paperslice
        </Link>
      </div>
    </div>
  ),
  component: ZineView,
});

function ZineView() {
  const zine = Route.useLoaderData();
  const isEmbed = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("embed") === "1";

  useEffect(() => {
    supabase.rpc("bump_zine_view", { _slug: zine.slug }).then(() => {});
  }, [zine.slug]);

  const photos = zine.assets.filter((a) => a.kind === "photo");
  const videos = zine.assets.filter((a) => a.kind === "video");
  const audios = zine.assets.filter((a) => a.kind === "audio");
  const showWatermark = (zine.profile?.tier ?? "free") === "free";

  return (
    <div
      className="grain min-h-screen bg-paper text-ink"
      style={
        {
          ["--zine-header" as string]: `'${zine.header_font}', serif`,
          ["--zine-body" as string]: `'${zine.body_font}', sans-serif`,
        } as React.CSSProperties
      }
    >
      {!isEmbed && (
        <header className="border-b border-rule bg-card">
          <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-3">
            <Link to="/" className="flex items-center" aria-label="Paperslice home">
              <img src={logoFold} alt="paperslice" className="h-7 w-auto" />
            </Link>
            <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-mid">
              {zine.profile && (
                <Link to="/u/$username" params={{ username: zine.profile.username }} className="hover:text-ink">
                  @{zine.profile.username}
                </Link>
              )}
              <span>{zine.view_count + 1} views</span>
            </div>
          </div>
        </header>
      )}

      <main className="mx-auto max-w-[820px] px-6 py-12 md:py-20">
        <div className="label-xs mb-3 text-[color:var(--accent-red)]">{zine.vibe} · {zine.format.replace("-", " ")}</div>
        <h1 className="font-display text-5xl leading-[1.05] tracking-tight md:text-7xl" style={{ fontFamily: "var(--zine-header)" }}>
          {zine.title}
        </h1>
        {zine.profile && (
          <p className="mt-3 font-mono text-[11px] text-ink-mid">
            by{" "}
            <Link to="/u/$username" params={{ username: zine.profile.username }} className="underline">
              @{zine.profile.username}
            </Link>
            {zine.published_at && ` · ${new Date(zine.published_at).toLocaleDateString()}`}
          </p>
        )}

        {zine.words.trim() && (
          <div
            className="mt-12 whitespace-pre-wrap text-[18px] leading-[1.85] text-ink"
            style={{ fontFamily: "var(--zine-body)" }}
          >
            {zine.words}
          </div>
        )}

        {photos.length > 0 && (
          <div className="mt-12 space-y-8">
            {photos.map((p) =>
              p.storage_path ? (
                <figure key={p.id} className="border border-rule bg-card p-2">
                  <img
                    src={publicAssetUrl(p.storage_path)}
                    alt={p.name}
                    loading="lazy"
                    className="w-full"
                  />
                </figure>
              ) : null,
            )}
          </div>
        )}

        {videos.length > 0 && (
          <div className="mt-12 space-y-6">
            {videos.map((v) =>
              v.storage_path ? (
                <video
                  key={v.id}
                  src={publicAssetUrl(v.storage_path)}
                  controls
                  playsInline
                  className="w-full border border-rule bg-ink"
                />
              ) : null,
            )}
          </div>
        )}

        {audios.length > 0 && (
          <div className="mt-10 space-y-3 border-t border-rule pt-8">
            <div className="label-xs">Soundtrack</div>
            {audios.map((a) =>
              a.storage_path ? (
                <div key={a.id} className="flex items-center gap-3">
                  <div className="font-mono text-[11px] text-ink-mid flex-1 truncate">{a.name}</div>
                  <audio src={publicAssetUrl(a.storage_path)} controls className="h-8" />
                </div>
              ) : null,
            )}
          </div>
        )}

        {showWatermark && (
          <footer className="mt-20 border-t border-rule pt-6 text-center">
            <a
              href="/"
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-light hover:text-ink"
            >
              made with paperslice.app
            </a>
          </footer>
        )}
      </main>
    </div>
  );
}
