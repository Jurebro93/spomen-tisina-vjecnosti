-- Update RLS policy to allow public access to funeral schedule data
DROP POLICY IF EXISTS "Public can read published obituaries" ON public.obituaries;

CREATE POLICY "Public can read published obituaries" 
ON public.obituaries 
FOR SELECT 
USING (active = true);

-- Also ensure that contact and schedule information is accessible for funeral schedules
CREATE POLICY "Public can read funeral schedule data" 
ON public.obituaries 
FOR SELECT 
USING (
  active = true AND 
  datum_ukopa IS NOT NULL
);