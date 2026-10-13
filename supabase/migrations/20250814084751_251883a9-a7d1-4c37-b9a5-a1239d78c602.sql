-- Fix the search path for the virtual candles function
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
SET search_path = public
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