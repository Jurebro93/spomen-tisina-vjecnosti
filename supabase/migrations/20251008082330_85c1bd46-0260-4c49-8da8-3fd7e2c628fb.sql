-- Ensure anon and authenticated roles can SELECT from public.obituaries
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.obituaries TO anon, authenticated;