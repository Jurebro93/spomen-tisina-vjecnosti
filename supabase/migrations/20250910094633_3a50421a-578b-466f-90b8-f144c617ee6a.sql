-- Fix RLS policies for memorijalni_citati completely

-- First, check and drop all existing policies
DROP POLICY IF EXISTS "Public can read approved quotes" ON public.memorijalni_citati;
DROP POLICY IF EXISTS "Service role can read memorijalni_citati" ON public.memorijalni_citati;
DROP POLICY IF EXISTS "Service role can update all quotes" ON public.memorijalni_citati;
DROP POLICY IF EXISTS "Service role access to memorijalni_citati" ON public.memorijalni_citati;
DROP POLICY IF EXISTS "Service role full access to memorijalni_citati" ON public.memorijalni_citati;

-- Create a simple policy for public to read approved quotes
CREATE POLICY "Allow public to read approved quotes" 
ON public.memorijalni_citati 
FOR SELECT 
USING (status = 'approved');

-- Create policy for service role (for admin functions)
CREATE POLICY "Allow service role full access" 
ON public.memorijalni_citati 
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);