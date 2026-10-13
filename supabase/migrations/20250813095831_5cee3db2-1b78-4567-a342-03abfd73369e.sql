-- Create a public view for virtual candles that excludes sensitive email information
CREATE VIEW public.virtual_candles_public 
WITH (security_invoker = true) AS 
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
  -- Excluded sensitive fields: zapalio_email, stripe_payment_intent_id
FROM public.virtual_candles
WHERE active = true AND paid = true;