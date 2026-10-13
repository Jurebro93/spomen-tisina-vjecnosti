DROP POLICY IF EXISTS "Service role can manage newsletter users" ON public.newsletter_users;
CREATE POLICY "Service role can manage newsletter users"
ON public.newsletter_users FOR ALL TO service_role
USING ((SELECT current_user) = 'service_role')
WITH CHECK ((SELECT current_user) = 'service_role');

DROP POLICY IF EXISTS "Service role can manage blogs" ON public.blogs;
CREATE POLICY "Service role can manage blogs"
ON public.blogs FOR ALL TO service_role
USING ((SELECT current_user) = 'service_role')
WITH CHECK ((SELECT current_user) = 'service_role');

DROP POLICY IF EXISTS "Service role can read all obituaries" ON public.obituaries;
CREATE POLICY "Service role can read all obituaries"
ON public.obituaries FOR SELECT TO service_role
USING ((SELECT current_user) = 'service_role');

DROP POLICY IF EXISTS "Service role can manage sitemaps" ON storage.objects;
CREATE POLICY "Service role can manage sitemaps"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'sitemaps' AND (SELECT current_user) = 'service_role')
WITH CHECK (bucket_id = 'sitemaps' AND (SELECT current_user) = 'service_role');