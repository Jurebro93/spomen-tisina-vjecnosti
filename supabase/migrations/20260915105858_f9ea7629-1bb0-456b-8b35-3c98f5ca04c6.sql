CREATE OR REPLACE FUNCTION public.create_memorial_person(
  _ime text,
  _prezime text,
  _datum_rodenja date DEFAULT NULL,
  _datum_smrti date DEFAULT NULL,
  _mjesto_rodenja text DEFAULT NULL,
  _mjesto_smrti text DEFAULT NULL,
  _groblje text DEFAULT NULL,
  _profesija text DEFAULT NULL
)
RETURNS public.obituaries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.obituaries;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF coalesce(btrim(_ime), '') = '' OR coalesce(btrim(_prezime), '') = '' THEN
    RAISE EXCEPTION 'Name is required';
  END IF;

  INSERT INTO public.obituaries (
    ime, prezime, datum_rodenja, datum_smrti, mjesto_rodenja, mjesto_smrti, groblje, profesija, active, paid
  ) VALUES (
    btrim(_ime), btrim(_prezime), _datum_rodenja, _datum_smrti,
    nullif(btrim(coalesce(_mjesto_rodenja, '')), ''),
    nullif(btrim(coalesce(_mjesto_smrti, '')), ''),
    nullif(btrim(coalesce(_groblje, '')), ''),
    nullif(btrim(coalesce(_profesija, '')), ''),
    false, false
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_memorial_person(text, text, date, date, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.memorial_stub_by_slug(_slug text)
RETURNS TABLE (id uuid, slug text, is_private boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.slug, true
  FROM public.memorials m
  WHERE m.slug = _slug
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.memorial_stub_by_slug(text) TO anon, authenticated;