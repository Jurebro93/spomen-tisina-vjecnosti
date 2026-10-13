-- Block all public access to sensitive tables and ensure only views are accessible

-- 1. Completely block public access to virtual_candles table
DROP POLICY IF EXISTS "Service role can access virtual_candles" ON public.virtual_candles;
DROP POLICY IF EXISTS "Anyone can insert candles" ON public.virtual_candles;
DROP POLICY IF EXISTS "Anyone can update payment status" ON public.virtual_candles;

-- Block all access except for authenticated service operations
CREATE POLICY "Block all public access to virtual_candles" 
ON public.virtual_candles 
FOR ALL 
USING (false)
WITH CHECK (false);

-- 2. Completely block public access to obituaries table
DROP POLICY IF EXISTS "Service role can access obituaries" ON public.obituaries;
DROP POLICY IF EXISTS "Anyone can insert obituaries" ON public.obituaries;
DROP POLICY IF EXISTS "Anyone can update payment status" ON public.obituaries;

-- Block all access except for service operations
CREATE POLICY "Block all public access to obituaries" 
ON public.obituaries 
FOR ALL 
USING (false)
WITH CHECK (false);

-- 3. Completely block public access to sprovodi table
DROP POLICY IF EXISTS "Service role can access sprovodi" ON public.sprovodi;
DROP POLICY IF EXISTS "Service role can insert sprovodi" ON public.sprovodi;
DROP POLICY IF EXISTS "Service role can update sprovodi" ON public.sprovodi;

-- Block all public access
CREATE POLICY "Block all public access to sprovodi" 
ON public.sprovodi 
FOR ALL 
USING (false)
WITH CHECK (false);