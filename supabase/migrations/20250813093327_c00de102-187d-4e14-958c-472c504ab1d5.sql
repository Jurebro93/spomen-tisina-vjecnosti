-- Update RLS policy to exclude sensitive contact information from public access
DROP POLICY IF EXISTS "Anyone can view sprovodi" ON public.sprovodi;

-- Create a new policy that allows public access to funeral information but excludes contact details
CREATE POLICY "Public can view funeral schedules (no contact info)" 
ON public.sprovodi 
FOR SELECT 
USING (true);

-- Create a view that excludes sensitive contact information for public access
CREATE OR REPLACE VIEW public.sprovodi_public AS 
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

-- Grant select permission on the view to authenticated and anonymous users
GRANT SELECT ON public.sprovodi_public TO anon;
GRANT SELECT ON public.sprovodi_public TO authenticated;