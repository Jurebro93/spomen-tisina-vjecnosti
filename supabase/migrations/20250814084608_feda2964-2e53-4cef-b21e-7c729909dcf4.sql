-- Ensure anon users can read public views by explicitly granting access

-- First, check if grants exist and recreate them if needed
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant SELECT access to all public views
GRANT SELECT ON public.virtual_candles_public TO anon, authenticated;
GRANT SELECT ON public.sprovodi_public TO anon, authenticated;
GRANT SELECT ON public.obituaries_public TO anon, authenticated;
GRANT SELECT ON public.memorijalni_citati_public TO anon, authenticated;

-- Also ensure the views are accessible to the public role  
GRANT SELECT ON public.virtual_candles_public TO public;
GRANT SELECT ON public.sprovodi_public TO public;
GRANT SELECT ON public.obituaries_public TO public;
GRANT SELECT ON public.memorijalni_citati_public TO public;