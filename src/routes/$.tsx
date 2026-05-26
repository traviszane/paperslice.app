import { createFileRoute, redirect, Link } from "@tanstack/react-router";

// Catch-all splat. Used to redirect /@username → /u/username,
// otherwise renders the 404 fallback.
export const Route = createFileRoute("/$")({
  beforeLoad: ({ params }) => {
    const splat = (params as { _splat?: string })._splat ?? "";
    if (splat.startsWith("@")) {
      const username = splat.slice(1).split("/")[0];
      if (/^[a-z0-9_]{3,24}$/.test(username)) {
        throw redirect({ to: "/u/$username", params: { username } });
      }
    }
  },
  component: () => (
    <div className="grain grid min-h-screen place-items-center bg-paper p-6 text-center">
      <div>
        <h1 className="font-display text-6xl">Nothing here.</h1>
        <p className="mt-2 font-serif italic text-ink-mid">That page doesn't exist.</p>
        <Link
          to="/"
          className="mt-6 inline-block border border-ink px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-ink hover:text-[color:var(--cotton)]"
        >
          ← back to paperslice
        </Link>
      </div>
    </div>
  ),
});
