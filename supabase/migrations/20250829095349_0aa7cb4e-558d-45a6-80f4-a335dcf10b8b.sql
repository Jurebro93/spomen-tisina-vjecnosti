-- Lock down newsletter_users: no public read or write, service role only
BEGIN;

-- Ensure RLS is enabled
ALTER TABLE public.newsletter_users ENABLE ROW LEVEL SECURITY;

-- Revoke any direct privileges from anon/authenticated
REVOKE ALL ON TABLE public.newsletter_users FROM anon;
REVOKE ALL ON TABLE public.newsletter_users FROM authenticated;

-- Drop any existing anon/auth policies just in case
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='newsletter_users' AND roles @> ARRAY['anon']::name[]
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Public can read newsletter users" ON public.newsletter_users';
    EXECUTE 'DROP POLICY IF EXISTS "Anon can select newsletter users" ON public.newsletter_users';
    EXECUTE 'DROP POLICY IF EXISTS "Anon can insert newsletter users" ON public.newsletter_users';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='newsletter_users' AND roles @> ARRAY['authenticated']::name[]
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can read newsletter users" ON public.newsletter_users';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can insert newsletter users" ON public.newsletter_users';
  END IF;
END $$;

-- Enforce explicit deny to public
DROP POLICY IF EXISTS "Block public read access to newsletter_users" ON public.newsletter_users;
DROP POLICY IF EXISTS "Block all public access to newsletter_users" ON public.newsletter_users;
CREATE POLICY "Block all public access to newsletter_users"
ON public.newsletter_users
FOR ALL
TO public
USING (false)
WITH CHECK (false);

-- Ensure service role has full access
DROP POLICY IF EXISTS "Service role full access to newsletter_users" ON public.newsletter_users;
CREATE POLICY "Service role full access to newsletter_users"
ON public.newsletter_users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMIT;