-- Fix RLS policies to ensure only service role access to sensitive data

-- Drop existing problematic policies and recreate with proper restrictions
DROP POLICY IF EXISTS "Public can view sprovodi data" ON public.sprovodi;
DROP POLICY IF EXISTS "Public can view active paid virtual candles" ON public.virtual_candles;

-- Ensure all sensitive tables are completely blocked for public access
-- sprovodi table - block all public access (contains contact info)
CREATE POLICY "Block all public access to sprovodi" 
ON public.sprovodi 
FOR ALL 
TO public 
USING (false) 
WITH CHECK (false);

-- virtual_candles table - block all public access (contains email addresses)
CREATE POLICY "Block all public access to virtual_candles" 
ON public.virtual_candles 
FOR ALL 
TO public 
USING (false) 
WITH CHECK (false);

-- newsletter_users table - already has blocking policy, ensure it's correct
DROP POLICY IF EXISTS "Block public read access to newsletter_users" ON public.newsletter_users;
CREATE POLICY "Block all public access to newsletter_users" 
ON public.newsletter_users 
FOR ALL 
TO public 
USING (false) 
WITH CHECK (false);

-- memorijalni_citati table - already has blocking policy, ensure it's correct
DROP POLICY IF EXISTS "Block public access to memorijalni_citati" ON public.memorijalni_citati;
CREATE POLICY "Block all public access to memorijalni_citati" 
ON public.memorijalni_citati 
FOR ALL 
TO public 
USING (false) 
WITH CHECK (false);

-- obituaries table - already has blocking policy, should be fine
-- Just ensure the policy name is consistent
DROP POLICY IF EXISTS "Block all public access to obituaries" ON public.obituaries;
CREATE POLICY "Block all public access to obituaries" 
ON public.obituaries 
FOR ALL 
TO public 
USING (false) 
WITH CHECK (false);

-- Ensure service role has full access to all tables
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