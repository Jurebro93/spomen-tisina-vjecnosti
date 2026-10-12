-- Update any existing obituaries that might not have slugs
UPDATE public.obituaries 
SET slug = generate_obituary_slug(ime, prezime, id) 
WHERE slug IS NULL OR slug = '';

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS obituaries_slug_trigger ON public.obituaries;

CREATE TRIGGER obituaries_slug_trigger
    BEFORE INSERT OR UPDATE ON public.obituaries
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_generate_obituary_slug();