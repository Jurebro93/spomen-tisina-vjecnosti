-- Fix security issues for all tables

-- 1. Update virtual_candles RLS to use the public view only
DROP POLICY IF EXISTS "Anyone can view active candles" ON public.virtual_candles;

-- Create restricted policy for virtual_candles table (internal use only)
CREATE POLICY "Service role can access virtual_candles" 
ON public.virtual_candles 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- 2. Fix sprovodi table to hide contact information
CREATE VIEW public.sprovodi_public 
WITH (security_invoker = true) AS 
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
  -- Excluded sensitive fields: kontakt_osoba_ime, kontakt_osoba_telefon
FROM public.sprovodi;

-- Update sprovodi RLS to restrict access to contact info
DROP POLICY IF EXISTS "Public can view funeral schedules (no contact info)" ON public.sprovodi;

CREATE POLICY "Service role can access sprovodi" 
ON public.sprovodi 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- 3. Fix obituaries table to hide sensitive contact information  
DROP POLICY IF EXISTS "Anyone can view active paid obituaries" ON public.obituaries;

CREATE POLICY "Service role can access obituaries" 
ON public.obituaries 
FOR ALL 
USING (current_setting('role') = 'service_role');