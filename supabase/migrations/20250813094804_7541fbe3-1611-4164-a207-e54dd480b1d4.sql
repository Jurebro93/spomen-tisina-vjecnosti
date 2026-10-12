-- Create a public view for obituaries that excludes sensitive contact information
CREATE VIEW public.obituaries_public 
WITH (security_invoker = true) AS 
SELECT 
  id,
  ime,
  prezime,
  datum_rodenja,
  datum_smrti,
  mjesto_rodenja,
  mjesto_smrti,
  biografija,
  fotografija_url,
  profesija,
  podnaslov,
  datum_ukopa,
  groblje,
  vrijeme_ukopa,
  ozalosceni,
  mjesna_zajednica,
  paid,
  active,
  created_at,
  updated_at
  -- Excluded sensitive fields: kontakt_osoba_ime, kontakt_osoba_email, kontakt_osoba_telefon, kontakt_osobe, stripe_payment_intent_id
FROM public.obituaries
WHERE active = true AND paid = true;