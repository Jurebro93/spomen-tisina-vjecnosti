-- Fix the final security issue by creating secure access functions

-- Also fix the memorijalni_citati table to hide email addresses
CREATE VIEW public.memorijalni_citati_public 
AS 
SELECT 
  id,
  created_at,
  updated_at,
  approved_at,
  tekst,
  autor,
  relacija,
  status,
  admin_komentar,
  approved_by
  -- Excluded: email_autora (sensitive data)
FROM public.memorijalni_citati
WHERE status = 'approved';

-- Grant public access to the cleaned view
GRANT SELECT ON public.memorijalni_citati_public TO anon, authenticated;

-- Block public access to the original table with sensitive emails
DROP POLICY IF EXISTS "Anyone can view approved quotes" ON public.memorijalni_citati;
DROP POLICY IF EXISTS "Anyone can submit quotes for approval" ON public.memorijalni_citati;

CREATE POLICY "Block public access to memorijalni_citati" 
ON public.memorijalni_citati 
FOR ALL 
USING (false)
WITH CHECK (false);

-- Allow service role access for backend operations
CREATE POLICY "Service role access to memorijalni_citati" 
ON public.memorijalni_citati 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);