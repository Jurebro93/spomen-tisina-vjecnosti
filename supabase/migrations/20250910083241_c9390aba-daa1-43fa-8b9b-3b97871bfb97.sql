-- Fix the security definer view issue by recreating it without SECURITY DEFINER
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