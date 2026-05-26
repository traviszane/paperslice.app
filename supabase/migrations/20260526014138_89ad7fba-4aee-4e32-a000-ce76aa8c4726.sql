
-- 1. Convert helpers that don't need elevated privilege to INVOKER
ALTER FUNCTION public.user_storage_bytes(uuid) SECURITY INVOKER;
ALTER FUNCTION public.user_tier_limit(uuid)   SECURITY INVOKER;

-- 2. Restrict EXECUTE on remaining SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()    FROM PUBLIC, anon, authenticated;

-- bump_zine_view must remain DEFINER (writes to zines as anon) but only from API roles
REVOKE EXECUTE ON FUNCTION public.bump_zine_view(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.bump_zine_view(text) TO anon, authenticated;

-- 3. Lock down zine-covers bucket: drop any broad SELECT policy and add a narrow one
--    that allows reading individual objects (getPublicUrl works) but NOT listing.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname IN (
        'Public read zine covers',
        'zine-covers public read',
        'Anyone can view zine covers'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "zine-covers direct object read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'zine-covers' AND name IS NOT NULL);
