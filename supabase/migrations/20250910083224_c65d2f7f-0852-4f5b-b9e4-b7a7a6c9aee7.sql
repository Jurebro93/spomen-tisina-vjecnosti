-- Update virtual candles to expire after 2 weeks instead of 7 days
ALTER TABLE public.virtual_candles 
ALTER COLUMN expires_at SET DEFAULT (now() + '14 days'::interval);

-- Update the public view to include expired candles
DROP VIEW IF EXISTS public.virtual_candles_public;

CREATE VIEW public.virtual_candles_public AS
SELECT 
    id,
    pokojnik_ime,
    pokojnik_prezime,
    zapalio_ime,
    poruka,
    created_at,
    expires_at,
    paid,
    active,
    CASE 
        WHEN expires_at > now() AND paid = true AND active = true THEN true
        ELSE false
    END as is_burning
FROM public.virtual_candles
WHERE paid = true AND active = true;

-- Grant select permissions on the view
GRANT SELECT ON public.virtual_candles_public TO anon;
GRANT SELECT ON public.virtual_candles_public TO authenticated;