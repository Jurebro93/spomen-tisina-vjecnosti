-- Drop the conflicting blocking policy
DROP POLICY IF EXISTS "Block all public access to obituaries" ON public.obituaries;

-- Ensure public can read active and published obituaries
DROP POLICY IF EXISTS "Public can read published obituaries" ON public.obituaries;
CREATE POLICY "Public can read published obituaries" 
ON public.obituaries 
FOR SELECT 
TO public
USING (active = true);

-- Ensure public can read funeral schedule data
DROP POLICY IF EXISTS "Public can read funeral schedule data" ON public.obituaries;
CREATE POLICY "Public can read funeral schedule data" 
ON public.obituaries 
FOR SELECT 
TO public
USING ((active = true) AND (datum_ukopa IS NOT NULL));