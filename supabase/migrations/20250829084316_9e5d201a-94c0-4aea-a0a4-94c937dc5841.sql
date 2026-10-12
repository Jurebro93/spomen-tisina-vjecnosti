-- Drop the security definer functions and replace with proper RLS policies

-- Drop the problematic view first
DROP VIEW IF EXISTS public.virtual_candles_public;

-- Drop the security definer functions
DROP FUNCTION IF EXISTS public.get_virtual_candles_public();
DROP FUNCTION IF EXISTS public.get_sprovodi_public();

-- Create proper RLS policies for public access to active, paid virtual candles
CREATE POLICY "Public can view active paid virtual candles" 
ON public.virtual_candles 
FOR SELECT 
USING (active = true AND paid = true);

-- Create proper RLS policies for public access to sprovodi data
CREATE POLICY "Public can view sprovodi data" 
ON public.sprovodi 
FOR SELECT 
USING (true);

-- Create a secure view for virtual candles without SECURITY DEFINER
CREATE VIEW public.virtual_candles_public AS
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