DROP POLICY IF EXISTS "Block all public access to sprovodi" ON public.sprovodi;

GRANT SELECT ON public.sprovodi TO anon, authenticated;

CREATE POLICY "Public can read funeral schedule"
ON public.sprovodi
FOR SELECT
TO anon, authenticated
USING (true);