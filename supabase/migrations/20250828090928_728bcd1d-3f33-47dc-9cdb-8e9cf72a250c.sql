-- Add slug field to groblja table
ALTER TABLE public.groblja 
ADD COLUMN IF NOT EXISTS slug text;

-- Create function to generate slug for groblja
CREATE OR REPLACE FUNCTION public.generate_groblje_slug(naziv_param text, id_param uuid)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $$
DECLARE
    base_slug text;
    final_slug text;
    counter integer := 0;
BEGIN
    -- Create base slug from naziv only
    base_slug := lower(trim(both from naziv_param));
    
    -- Replace Croatian characters and special characters
    base_slug := replace(base_slug, 'č', 'c');
    base_slug := replace(base_slug, 'ć', 'c');
    base_slug := replace(base_slug, 'ž', 'z');
    base_slug := replace(base_slug, 'š', 's');
    base_slug := replace(base_slug, 'đ', 'd');
    base_slug := replace(base_slug, ' ', '-');
    base_slug := replace(base_slug, ':', '');
    base_slug := replace(base_slug, ',', '');
    base_slug := replace(base_slug, '.', '');
    
    -- Remove any non-alphanumeric characters except hyphens
    base_slug := regexp_replace(base_slug, '[^a-z0-9\-]', '', 'g');
    
    -- Remove multiple consecutive hyphens
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    
    -- Remove leading and trailing hyphens
    base_slug := trim(both '-' from base_slug);
    
    final_slug := base_slug;
    
    -- Check if slug already exists and append number if needed
    WHILE EXISTS (
        SELECT 1 FROM public.groblja 
        WHERE slug = final_slug AND id != id_param
    ) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter::text;
    END LOOP;
    
    RETURN final_slug;
END;
$$;

-- Create trigger function for groblja slug generation
CREATE OR REPLACE FUNCTION public.trigger_generate_groblje_slug()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := generate_groblje_slug(NEW.naziv, NEW.id);
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger for automatic slug generation
CREATE TRIGGER generate_groblje_slug_trigger
    BEFORE INSERT OR UPDATE ON public.groblja
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_generate_groblje_slug();

-- Generate slugs for existing records
UPDATE public.groblja 
SET slug = generate_groblje_slug(naziv, id)
WHERE slug IS NULL OR slug = '';