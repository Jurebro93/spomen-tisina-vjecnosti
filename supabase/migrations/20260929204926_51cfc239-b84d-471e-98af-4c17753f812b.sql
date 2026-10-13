DROP POLICY IF EXISTS "Everyone can read groblja_i_opisi" ON public.groblja_i_opisi;
CREATE POLICY "Public can read complete cemetery descriptions"
ON public.groblja_i_opisi
FOR SELECT TO anon, authenticated
USING ("Naziv groblja" IS NOT NULL AND btrim("Naziv groblja") <> '' AND "Grad" IS NOT NULL AND btrim("Grad") <> '');

DROP POLICY IF EXISTS "Service role can read newsletter_users" ON public.newsletter_users;
DROP POLICY IF EXISTS "Service role can insert newsletter_users" ON public.newsletter_users;
DROP POLICY IF EXISTS "Service role full access to newsletter_users" ON public.newsletter_users;
CREATE POLICY "Service role can manage newsletter users"
ON public.newsletter_users
FOR ALL TO service_role
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS "Service role full access to blogs" ON public.blogs;
CREATE POLICY "Service role can manage blogs"
ON public.blogs
FOR ALL TO service_role
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');
DROP POLICY IF EXISTS "Everyone can read blogs" ON public.blogs;
CREATE POLICY "Public can read published blog entries"
ON public.blogs
FOR SELECT TO anon, authenticated
USING (slug IS NOT NULL AND btrim(slug) <> '' AND title IS NOT NULL AND btrim(title) <> '');

DROP POLICY IF EXISTS "Service role can read pogrebna_poduzeca" ON public.pogrebna_poduzeca;
CREATE POLICY "Public can read listed funeral homes"
ON public.pogrebna_poduzeca
FOR SELECT TO anon, authenticated
USING (slug IS NOT NULL AND btrim(slug) <> '' AND naziv IS NOT NULL AND btrim(naziv) <> '');

DROP POLICY IF EXISTS "Public can read funeral schedule" ON public.sprovodi;
CREATE POLICY "Public can read dated funeral schedule"
ON public.sprovodi
FOR SELECT TO anon, authenticated
USING (datum_sprovoda IS NOT NULL AND ime IS NOT NULL AND btrim(ime) <> '' AND prezime IS NOT NULL AND btrim(prezime) <> '');

DROP POLICY IF EXISTS "Service role can read obituaries" ON public.obituaries;
CREATE POLICY "Public can read active obituaries"
ON public.obituaries
FOR SELECT TO anon, authenticated
USING (active IS TRUE);
CREATE POLICY "Service role can read all obituaries"
ON public.obituaries
FOR SELECT TO service_role
USING ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS "Service role can read groblja" ON public.groblja;
CREATE POLICY "Public can read listed cemeteries"
ON public.groblja
FOR SELECT TO anon, authenticated
USING (slug IS NOT NULL AND btrim(slug) <> '' AND naziv IS NOT NULL AND btrim(naziv) <> '');

DROP POLICY IF EXISTS "Service role can read on_page_seo" ON public.on_page_seo;
CREATE POLICY "Public can read valid page SEO"
ON public.on_page_seo
FOR SELECT TO anon, authenticated
USING (page_path IS NOT NULL AND btrim(page_path) <> '' AND meta_title IS NOT NULL AND btrim(meta_title) <> '');

DROP POLICY IF EXISTS "Anyone can view obituary photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload obituary photos" ON storage.objects;
DROP POLICY IF EXISTS "Public sitemap access" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage sitemaps" ON storage.objects;
CREATE POLICY "Service role can manage sitemaps"
ON storage.objects
FOR ALL TO service_role
USING (bucket_id = 'sitemaps' AND (SELECT auth.role()) = 'service_role')
WITH CHECK (bucket_id = 'sitemaps' AND (SELECT auth.role()) = 'service_role');