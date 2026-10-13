REVOKE SELECT ON public.obituaries FROM anon, authenticated;
GRANT SELECT (
  id, ime, prezime, datum_rodenja, datum_smrti, mjesto_rodenja, mjesto_smrti,
  biografija, fotografija_url, active, created_at, updated_at, groblje,
  datum_ukopa, vrijeme_ukopa, ozalosceni, mjesna_zajednica, profesija,
  podnaslov, slug, meta_title, meta_description
) ON public.obituaries TO anon, authenticated;
GRANT ALL ON public.obituaries TO service_role;