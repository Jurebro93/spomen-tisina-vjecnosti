-- Create the remaining security definer functions and views

-- Sprovodi public function and view
CREATE OR REPLACE FUNCTION public.get_sprovodi_public()
RETURNS TABLE (
  id uuid,
  datum_sprovoda date,
  vrijeme_sprovoda time,
  datum_smrti date,
  godina integer,
  datum_rodenja date,
  ime text,
  prezime text,
  groblje text,
  grad text,
  lokacija text,
  tip_sprovoda text,
  dvorana text,
  parcel text,
  broj_groba text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
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
  FROM sprovodi;
$$;

GRANT EXECUTE ON FUNCTION public.get_sprovodi_public() TO anon, authenticated;

CREATE VIEW public.sprovodi_public AS
SELECT * FROM public.get_sprovodi_public();

GRANT SELECT ON public.sprovodi_public TO anon, authenticated;

-- Obituaries public function and view
CREATE OR REPLACE FUNCTION public.get_obituaries_public()
RETURNS TABLE (
  id uuid,
  datum_rodenja date,
  datum_smrti date,
  datum_ukopa timestamptz,
  paid boolean,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  ime text,
  prezime text,
  mjesto_rodenja text,
  mjesto_smrti text,
  biografija text,
  fotografija_url text,
  profesija text,
  podnaslov text,
  groblje text,
  vrijeme_ukopa text,
  ozalosceni text[],
  mjesna_zajednica text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
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
  FROM obituaries
  WHERE active = true AND paid = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_obituaries_public() TO anon, authenticated;

CREATE VIEW public.obituaries_public AS
SELECT * FROM public.get_obituaries_public();

GRANT SELECT ON public.obituaries_public TO anon, authenticated;