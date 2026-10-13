-- Create a view for public access to approved quotes
CREATE OR REPLACE VIEW public.approved_memorial_quotes AS
SELECT 
    id,
    tekst,
    autor,
    relacija,
    approved_at,
    created_at
FROM public.memorijalni_citati 
WHERE status = 'approved';

-- Grant public access to the view
GRANT SELECT ON public.approved_memorial_quotes TO anon;
GRANT SELECT ON public.approved_memorial_quotes TO authenticated;