-- Let admins read newsletter subscribers for the admin statistics "Prijave" tab.
GRANT SELECT ON public.newsletter_users TO authenticated;
DROP POLICY IF EXISTS "Admins read newsletter users" ON public.newsletter_users;
CREATE POLICY "Admins read newsletter users" ON public.newsletter_users
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
