-- Drop function and dependent view, then recreate everything with slug column
DROP FUNCTION public.get_obituaries_public() CASCADE;

-- Recreate the function with slug column
CREATE OR REPLACE FUNCTION public.get_obituaries_public()
 RETURNS TABLE(id uuid, datum_rodenja date, datum_smrti date, datum_ukopa timestamp with time zone, paid boolean, active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, ime text, prezime text, mjesto_rodenja text, mjesto_smrti text, biografija text, fotografija_url text, profesija text, podnaslov text, groblje text, vrijeme_ukopa text, ozalosceni text[], mjesna_zajednica text, slug text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    mjesna_zajednica,
    slug
  FROM obituaries
  WHERE active = true AND paid = true;
$function$

-- Recreate the view with slug column
CREATE VIEW obituaries_public AS
SELECT * FROM get_obituaries_public();