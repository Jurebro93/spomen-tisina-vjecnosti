-- Allow service role (Edge Functions) to access sensitive tables for backend operations
-- while keeping public access completely blocked

-- 1. Allow service role to manage virtual_candles for backend operations
CREATE POLICY "Service role full access to virtual_candles" 
ON public.virtual_candles 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Allow service role to manage obituaries for backend operations  
CREATE POLICY "Service role full access to obituaries" 
ON public.obituaries 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Allow service role to manage sprovodi for backend operations
CREATE POLICY "Service role full access to sprovodi" 
ON public.sprovodi 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);