-- Remove public read access from obituaries
DROP POLICY IF EXISTS "Anon can read obituaries" ON public.obituaries;

-- Remove public read access from groblja  
DROP POLICY IF EXISTS "Public read access to groblja" ON public.groblja;

-- Remove public read access from pogrebna_poduzeca
DROP POLICY IF EXISTS "Public read access to pogrebna_poduzeca" ON public.pogrebna_poduzeca;

-- Remove public read access from on_page_seo
DROP POLICY IF EXISTS "Public read access to on_page_seo" ON public.on_page_seo;

-- Remove public read access from memorijalni_citati
DROP POLICY IF EXISTS "Public can view approved quotes" ON public.memorijalni_citati;

-- Remove public insert access from newsletter_users
DROP POLICY IF EXISTS "Public can subscribe to newsletter" ON public.newsletter_users;

-- Add service role read access for all tables that need it
CREATE POLICY "Service role can read obituaries" ON public.obituaries
FOR SELECT USING (true);

CREATE POLICY "Service role can read groblja" ON public.groblja  
FOR SELECT USING (true);

CREATE POLICY "Service role can read pogrebna_poduzeca" ON public.pogrebna_poduzeca
FOR SELECT USING (true);

CREATE POLICY "Service role can read on_page_seo" ON public.on_page_seo
FOR SELECT USING (true);

CREATE POLICY "Service role can read memorijalni_citati" ON public.memorijalni_citati
FOR SELECT USING (true);

CREATE POLICY "Service role can read newsletter_users" ON public.newsletter_users
FOR SELECT USING (true);

CREATE POLICY "Service role can insert newsletter_users" ON public.newsletter_users
FOR INSERT WITH CHECK (true);