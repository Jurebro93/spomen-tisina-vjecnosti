-- Fix view access by creating security definer functions instead of relying on views

-- Drop existing views 
DROP VIEW IF EXISTS public.virtual_candles_public;
DROP VIEW IF EXISTS public.sprovodi_public;
DROP VIEW IF EXISTS public.obituaries_public;
DROP VIEW IF EXISTS public.memorijalni_citati_public;

-- Create security definer functions that bypass RLS for reading public data
CREATE OR REPLACE FUNCTION public.get_virtual_candles_public()
RETURNS TABLE (
  id uuid,
  pokojnik_ime text,
  pokojnik_prezime text,
  zapalio_ime text,
  poruka text,
  paid boolean,
  active boolean,
  expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    id,
    pokojnik_ime,
    pokojnik_prezime,
    zapalio_ime,
    poruka,
    paid,
    active,
    expires_at,
    created_at
  FROM virtual_candles
  WHERE active = true AND paid = true;
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION public.get_virtual_candles_public() TO anon, authenticated;

-- Create the view using the function  
CREATE VIEW public.virtual_candles_public AS
SELECT * FROM public.get_virtual_candles_public();

-- Grant access to the view
GRANT SELECT ON public.virtual_candles_public TO anon, authenticated;