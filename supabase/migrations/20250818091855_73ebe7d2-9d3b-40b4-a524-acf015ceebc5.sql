-- Allow public read access to approved memorial quotes
DROP POLICY IF EXISTS "Public can view approved quotes" ON memorijalni_citati;

CREATE POLICY "Public can view approved quotes" 
ON memorijalni_citati 
FOR SELECT 
USING (status = 'approved');