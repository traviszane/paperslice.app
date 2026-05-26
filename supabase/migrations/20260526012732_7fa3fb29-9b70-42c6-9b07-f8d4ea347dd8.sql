
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.tier_name AS ENUM ('free', 'maker', 'pro');
CREATE TYPE public.zine_format AS ENUM ('single-sheet', 'ebook', 'printable-zine', 'two-page', 'instagram');
CREATE TYPE public.zine_vibe AS ENUM ('grain', 'editorial', 'collage', 'typewriter', 'minimal');
CREATE TYPE public.text_shape AS ENUM ('normal', 'wavy', 'circle', 'diagonal', 'stacked', 'scattered', 'outlined', 'arc');
CREATE TYPE public.asset_kind AS ENUM ('photo', 'video', 'audio', 'text');

-- =========================================================
-- UPDATED-AT helper
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================================
-- TIERS (reference table, public read)
-- =========================================================
CREATE TABLE public.tiers (
  name public.tier_name PRIMARY KEY,
  storage_bytes BIGINT NOT NULL,
  max_zines INT,
  can_remove_watermark BOOLEAN NOT NULL DEFAULT false,
  monthly_price_cents INT NOT NULL DEFAULT 0,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.tiers (name, storage_bytes, max_zines, can_remove_watermark, monthly_price_cents, label) VALUES
  ('free',  524288000,   3,   false, 0,    'Free'),
  ('maker', 2147483648,  25,  false, 600,  'Maker'),
  ('pro',   10737418240, NULL,true,  1500, 'Pro');

ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tiers are public" ON public.tiers FOR SELECT USING (true);

-- =========================================================
-- PROFILES (1:1 with auth.users, public read)
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE
    CHECK (username ~ '^[a-z0-9_]{3,24}$'),
  display_name TEXT,
  bio TEXT CHECK (char_length(bio) <= 280),
  avatar_url TEXT,
  tier public.tier_name NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_username ON public.profiles (lower(username));

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are public" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup. Username derived from email local-part,
-- sanitised + suffixed to guarantee uniqueness.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base TEXT;
  candidate TEXT;
  n INT := 0;
BEGIN
  base := lower(regexp_replace(split_part(coalesce(NEW.email, ''), '@', 1), '[^a-z0-9_]', '', 'g'));
  IF base IS NULL OR char_length(base) < 3 THEN
    base := 'maker' || substr(replace(NEW.id::text, '-', ''), 1, 6);
  END IF;
  IF char_length(base) > 20 THEN base := substr(base, 1, 20); END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) LOOP
    n := n + 1;
    candidate := substr(base, 1, 20) || n::text;
  END LOOP;
  INSERT INTO public.profiles (id, username, display_name, tier)
    VALUES (NEW.id, candidate, coalesce(NEW.raw_user_meta_data->>'display_name', candidate), 'free');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- ZINES
-- =========================================================
CREATE TABLE public.zines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Zine' CHECK (char_length(title) BETWEEN 1 AND 120),
  slug TEXT UNIQUE CHECK (slug IS NULL OR slug ~ '^[a-z0-9-]{3,60}$'),
  format public.zine_format NOT NULL DEFAULT 'single-sheet',
  ig_ratio TEXT,
  vibe public.zine_vibe NOT NULL DEFAULT 'grain',
  header_font TEXT NOT NULL DEFAULT 'Instrument Serif',
  body_font TEXT NOT NULL DEFAULT 'Work Sans',
  text_shape public.text_shape NOT NULL DEFAULT 'normal',
  words TEXT NOT NULL DEFAULT '',
  cover_path TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  view_count BIGINT NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_zines_user ON public.zines (user_id, updated_at DESC);
CREATE INDEX idx_zines_slug ON public.zines (slug) WHERE published = true;
CREATE INDEX idx_zines_pub ON public.zines (user_id, published, published_at DESC);

ALTER TABLE public.zines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners full access to own zines" ON public.zines
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view published zines" ON public.zines
  FOR SELECT
  USING (published = true);

CREATE TRIGGER trg_zines_updated_at
  BEFORE UPDATE ON public.zines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- ASSETS (photos, video, audio, text blocks)
-- =========================================================
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zine_id UUID NOT NULL REFERENCES public.zines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.asset_kind NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) <= 255),
  storage_path TEXT,                         -- key in storage.objects (zine-assets bucket)
  size_bytes BIGINT NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  mime_type TEXT,
  duration_sec REAL,                         -- video / audio
  page INT,                                  -- optional page assignment
  position INT NOT NULL DEFAULT 0,           -- ordering inside the zine
  text_content TEXT,                         -- only for kind='text'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assets_zine ON public.assets (zine_id, position);
CREATE INDEX idx_assets_user ON public.assets (user_id);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners full access to own assets" ON public.assets
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view assets of published zines" ON public.assets
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.zines z
    WHERE z.id = assets.zine_id AND z.published = true
  ));

-- =========================================================
-- STORAGE USAGE helper (used for tier-limit checks)
-- =========================================================
CREATE OR REPLACE FUNCTION public.user_storage_bytes(_user_id UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(sum(size_bytes), 0)::bigint
  FROM public.assets
  WHERE user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.user_tier_limit(_user_id UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.storage_bytes
  FROM public.profiles p
  JOIN public.tiers t ON t.name = p.tier
  WHERE p.id = _user_id;
$$;

-- =========================================================
-- VIEW COUNT bump (for public zine pages — anyone can call)
-- =========================================================
CREATE OR REPLACE FUNCTION public.bump_zine_view(_slug TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.zines
  SET view_count = view_count + 1
  WHERE slug = _slug AND published = true;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_zine_view(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_zine_view(TEXT) TO anon, authenticated;

-- =========================================================
-- STORAGE BUCKETS
-- =========================================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('zine-assets', 'zine-assets', false),
  ('zine-covers', 'zine-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Private user assets: each user owns the folder named after their UUID.
CREATE POLICY "Users read own zine assets"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'zine-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'zine-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users update own zine assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'zine-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users delete own zine assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'zine-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Published zine assets: anyone can read files belonging to a published zine.
CREATE POLICY "Published zine assets are publicly readable"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'zine-assets'
  AND EXISTS (
    SELECT 1 FROM public.assets a
    JOIN public.zines z ON z.id = a.zine_id
    WHERE a.storage_path = storage.objects.name
      AND z.published = true
  )
);

-- Public cover bucket
CREATE POLICY "Anyone can read zine covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'zine-covers');

CREATE POLICY "Users upload own covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'zine-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users update own covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'zine-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users delete own covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'zine-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
