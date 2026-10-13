-- Fix RLS policies for memorijalni_citati to allow public reading of approved quotes

-- First, drop the conflicting policy that blocks all public access
DROP POLICY IF EXISTS "Block all public access to memorijalni_citati" ON public.memorijalni_citati;

-- Ensure the policy for reading approved quotes exists and works
DROP POLICY IF EXISTS "Public can read approved quotes" ON public.memorijalni_citati;

-- Create a proper policy for public to read approved quotes
CREATE POLICY "Public can read approved quotes" 
ON public.memorijalni_citati 
FOR SELECT 
TO public
USING (status = 'approved');

-- Keep service role policies for admin functions
-- (These should already exist and work fine)