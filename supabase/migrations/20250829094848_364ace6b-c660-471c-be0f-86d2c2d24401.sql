-- Public-safe read access with column-level grants and RLS
BEGIN;

-- Allow public (anon) to read only safe rows
DROP POLICY IF EXISTS "Public can read published obituaries" ON public.obituaries;
CREATE POLICY "Public can read published obituaries"
ON public.obituaries
FOR SELECT
TO anon
USING (active = true);

DROP POLICY IF EXISTS "Public can read approved quotes" ON public.memorijalni_citati;
CREATE POLICY "Public can read approved quotes"
ON public.memorijalni_citati
FOR SELECT
TO anon
USING (status = 'approved');

DROP POLICY IF EXISTS "Public can read active paid candles" ON public.virtual_candles;
CREATE POLICY "Public can read active paid candles"
ON public.virtual_candles
FOR SELECT
TO anon
USING (active = true AND paid = true);

-- Column-level grants: expose only non-sensitive fields to anon
REVOKE ALL ON TABLE public.obituaries FROM anon;
GRANT SELECT (
  id, ime, prezime, slug, podnaslov, profesija, datum_rodenja, datum_smrti,
  active, created_at, updated_at, vrijeme_ukopa, groblje, datum_ukopa,
  fotografija_url, biografija, mjesto_rodenja, mjesto_smrti, meta_title, meta_description, ozalosceni
) ON public.obituaries TO anon;

REVOKE ALL ON TABLE public.memorijalni_citati FROM anon;
GRANT SELECT (id, autor, tekst, relacija, status, approved_at, created_at)
ON public.memorijalni_citati TO anon;

REVOKE ALL ON TABLE public.virtual_candles FROM anon;
GRANT SELECT (id, created_at, expires_at, active, paid, pokojnik_ime, pokojnik_prezime, poruka)
ON public.virtual_candles TO anon;

-- Recreate the virtual_candles_public view without SECURITY DEFINER and as SECURITY INVOKER
DROP VIEW IF EXISTS public.virtual_candles_public;
CREATE VIEW public.virtual_candles_public WITH (security_invoker=true) AS
SELECT id, created_at, expires_at, active, paid, pokojnik_ime, pokojnik_prezime, poruka
FROM public.virtual_candles
WHERE active = true AND paid = true;

COMMIT;