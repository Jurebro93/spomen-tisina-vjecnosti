-- Fix the security definer issue by recreating the view as SECURITY INVOKER
DROP VIEW IF EXISTS public.sprovodi_public;

-- Create a security invoker view that excludes sensitive contact information
CREATE VIEW public.sprovodi_public 
WITH (security_invoker = true) AS 
SELECT 
  id,
  datum_sprovoda,
  vrijeme_sprovoda,
  created_at,
  updated_at,
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
  broj_groba
  -- Excluded: kontakt_osoba_ime, kontakt_osoba_telefon
FROM public.sprovodi;