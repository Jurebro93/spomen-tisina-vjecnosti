-- Fix RLS policies to ensure only service role access to sensitive data
-- Handle existing policies properly

-- Drop all existing problematic policies first
DROP POLICY IF EXISTS "Public can view sprovodi data" ON public.sprovodi;
DROP POLICY IF EXISTS "Public can view active paid virtual candles" ON public.virtual_candles;
DROP POLICY IF EXISTS "Block public read access to newsletter_users" ON public.newsletter_users;
DROP POLICY IF EXISTS "Block public access to memorijalni_citati" ON public.memorijalni_citati;
DROP POLICY IF EXISTS "Block all public access to obituaries" ON public.obituaries;
DROP POLICY IF EXISTS "Block all public access to sprovodi" ON public.sprovodi;
DROP POLICY IF EXISTS "Block all public access to virtual_candles" ON public.virtual_candles;
DROP POLICY IF EXISTS "Block all public access to newsletter_users" ON public.newsletter_users;
DROP POLICY IF EXISTS "Block all public access to memorijalni_citati" ON public.memorijalni_citati;

-- Remove existing service role policies to recreate them consistently
DROP POLICY IF EXISTS "Service role full access to sprovodi" ON public.sprovodi;
DROP POLICY IF EXISTS "Service role full access to virtual_candles" ON public.virtual_candles;
DROP POLICY IF EXISTS "Service role full access to newsletter_users" ON public.newsletter_users;
DROP POLICY IF EXISTS "Service role full access to memorijalni_citati" ON public.memorijalni_citati;
DROP POLICY IF EXISTS "Service role full access to obituaries" ON public.obituaries;

-- Create blocking policies for all sensitive tables
CREATE POLICY "Block all public access to sprovodi" 
ON public.sprovodi 
FOR ALL 
TO public 
USING (false) 
WITH CHECK (false);

CREATE POLICY "Block all public access to virtual_candles" 
ON public.virtual_candles 
FOR ALL 
TO public 
USING (false) 
WITH CHECK (false);

CREATE POLICY "Block all public access to newsletter_users" 
ON public.newsletter_users 
FOR ALL 
TO public 
USING (false) 
WITH CHECK (false);

CREATE POLICY "Block all public access to memorijalni_citati" 
ON public.memorijalni_citati 
FOR ALL 
TO public 
USING (false) 
WITH CHECK (false);

CREATE POLICY "Block all public access to obituaries" 
ON public.obituaries 
FOR ALL 
TO public 
USING (false) 
WITH CHECK (false);

-- Create service role access policies
CREATE POLICY "Service role full access to sprovodi" 
ON public.sprovodi 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role full access to virtual_candles" 
ON public.virtual_candles 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role full access to newsletter_users" 
ON public.newsletter_users 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role full access to memorijalni_citati" 
ON public.memorijalni_citati 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role full access to obituaries" 
ON public.obituaries 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);