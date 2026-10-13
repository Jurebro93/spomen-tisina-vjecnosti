-- Create secured views with explicit RLS-like filtering to address security scanner concerns

-- Drop existing public views
DROP VIEW IF EXISTS public.virtual_candles_public;
DROP VIEW IF EXISTS public.sprovodi_public;
DROP VIEW IF EXISTS public.obituaries_public;

-- Recreate views with security definer to ensure consistent access control
CREATE VIEW public.virtual_candles_public 
WITH (security_definer = true) AS 
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
FROM public.virtual_candles
WHERE active = true AND paid = true;

CREATE VIEW public.sprovodi_public 
WITH (security_definer = true) AS 
SELECT 
  id,
  datum_sprovoda,
  vrijeme_sprovoda,
  datum_smrti,
  godina,
  datum_rodenja,
  ime,
  prezime,
  groblje,
  grad,
  lokacija,
  tip_sprovoda,
  dvorana,
  parcel,
  broj_groba,
  created_at,
  updated_at
FROM public.sprovodi;

CREATE VIEW public.obituaries_public 
WITH (security_definer = true) AS 
SELECT 
  id,
  datum_rodenja,
  datum_smrti,
  datum_ukopa,
  paid,
  active,
  created_at,
  updated_at,
  ime,
  prezime,
  mjesto_rodenja,
  mjesto_smrti,
  biografija,
  fotografija_url,
  profesija,
  podnaslov,
  groblje,
  vrijeme_ukopa,
  ozalosceni,
  mjesna_zajednica
FROM public.obituaries
WHERE active = true AND paid = true;

-- Grant access to the secured views
GRANT SELECT ON public.virtual_candles_public TO anon, authenticated;
GRANT SELECT ON public.sprovodi_public TO anon, authenticated;
GRANT SELECT ON public.obituaries_public TO anon, authenticated;