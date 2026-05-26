import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { publicAssetUrl } from "@/lib/publish";
import logoFold from "@/assets/logo-handprint.png";

interface ProfileWithZines {
  username: string;
  display_name: string | null;
  bio: string | null;
  tier: string;
  zines: Array<{
    id: string;
    title: string;
    slug: string;
    cover_path: string | null;
    view_count: number;
    published_at: string | null;
    vibe: string;
  }>;
}

async function loadProfile(username: string): Promise<ProfileWithZines> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, tier")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (!profile) throw notFound();

  const { data: zineRows } = await supabase
    .from("zines")
    .select("id, title, slug, cover_path, view_count, published_at, vibe")
    .eq("user_id", profile.id)
    .eq("published", true)
    .order("published_at", { ascending: false });

  const zines = (zineRows ?? [])
    .filter((z): z is typeof z & { slug: string } => !!z.slug)
    .map((z) => ({
      id: z.id,
      title: z.title,
      slug: z.slug,
      cover_path: z.cover_path,
      view_count: z.view_count,
      published_at: z.published_at,
      vibe: z.vibe as string,
    }));

  return {
    username: profile.username,
    display_name: profile.display_name,
    bio: profile.bio,
    tier: profile.tier,
    zines,
  };
}

export const Route = createFileRoute("/u/$username")({
  loader: ({ params }) => loadProfile(params.username),
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `@${loaderData.username} — Paperslice` },
          {
            name: "description",
            content: `${loaderData.display_name ?? "@" + loaderData.username} on Paperslice — ${loaderData.zines.length} published zine${loaderData.zines.length === 1 ? "" : "s"}.`,
          },
          { property: "og:title", content: `@${loaderData.username} on Paperslice` },
          {
            property: "og:description",
            content: loaderData.bio || `${loaderData.zines.length} published zine${loaderData.zines.length === 1 ? "" : "s"}`,
          },
        ]
      : [{ title: "Profile — Paperslice" }],
  }),
  notFoundComponent: () => (
    <div className="grain grid min-h-screen place-items-center bg-paper p-6 text-center">
      <div>
        <h1 className="font-display text-5xl">No one here.</h1>
        <p className="mt-2 font-serif italic text-ink-mid">That username isn't taken yet.</p>
        <Link
          to="/"
          className="mt-6 inline-block border border-ink px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-ink hover:text-[color:var(--paper)]"
        >
          ← back to paperslice
        </Link>
      </div>
    </div>
  ),
  component: ProfilePage,
});

function ProfilePage() {
  const p = Route.useLoaderData();

  return (
    <div className="grain min-h-screen bg-paper text-ink">
      <header className="border-b border-rule bg-card">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center" aria-label="Paperslice home">
            <img src={logoFold} alt="paperslice" className="h-7 w-auto" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-6 py-12 md:py-16">
        <div className="border-b border-rule pb-10">
          <div className="label-xs">profile</div>
          <h1 className="mt-2 font-display text-5xl md:text-6xl">@{p.username}</h1>
          {p.display_name && p.display_name !== p.username && (
            <p className="mt-1 font-serif italic text-ink-mid text-lg">{p.display_name}</p>
          )}
          {p.bio && <p className="mt-4 max-w-xl font-serif text-[15px] italic leading-relaxed text-ink-mid">{p.bio}</p>}
          <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-light">
            {p.zines.length} published · {p.tier} tier
          </div>
        </div>

        {p.zines.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="font-serif italic text-ink-mid">No zines published yet.</p>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {p.zines.map((z: ProfileWithZines["zines"][number]) => (
              <Link
                key={z.id}
                to="/zines/$slug"
                params={{ slug: z.slug }}
                className="group block border border-rule bg-card transition hover:-translate-y-0.5 hover:border-ink"
              >
                <div className="aspect-[4/5] overflow-hidden bg-paper-deep">
                  {z.cover_path ? (
                    <img
                      src={publicAssetUrl(z.cover_path)}
                      alt={z.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="grid h-full place-items-center font-display text-3xl text-ink-light">
                      {z.title[0]?.toUpperCase() ?? "·"}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="label-xs mb-1 text-[color:var(--accent-red)]">{z.vibe}</div>
                  <div className="font-display text-xl leading-tight">{z.title}</div>
                  <div className="mt-1 font-mono text-[10px] text-ink-light">
                    {z.view_count} views
                    {z.published_at && ` · ${new Date(z.published_at).toLocaleDateString()}`}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
