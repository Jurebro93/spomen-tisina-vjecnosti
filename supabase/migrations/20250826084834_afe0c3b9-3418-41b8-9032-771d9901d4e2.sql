-- Add slug column to obituaries table
ALTER TABLE public.obituaries 
ADD COLUMN slug text;

-- Create function to generate slug from name
CREATE OR REPLACE FUNCTION generate_obituary_slug(ime_param text, prezime_param text, id_param uuid)
RETURNS text AS $$
DECLARE
    base_slug text;
    final_slug text;
    counter integer := 0;
BEGIN
    -- Create base slug from name and surname
    base_slug := lower(trim(both from ime_param)) || '-' || lower(trim(both from prezime_param));
    
    -- Replace Croatian characters and special characters
    base_slug := replace(base_slug, 'č', 'c');
    base_slug := replace(base_slug, 'ć', 'c');
    base_slug := replace(base_slug, 'ž', 'z');
    base_slug := replace(base_slug, 'š', 's');
    base_slug := replace(base_slug, 'đ', 'd');
    base_slug := replace(base_slug, ' ', '-');
    
    -- Remove any non-alphanumeric characters except hyphens
    base_slug := regexp_replace(base_slug, '[^a-z0-9\-]', '', 'g');
    
    -- Remove multiple consecutive hyphens
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    
    -- Remove leading and trailing hyphens
    base_slug := trim(both '-' from base_slug);
    
    final_slug := base_slug;
    
    -- Check if slug already exists and append number if needed
    WHILE EXISTS (
        SELECT 1 FROM public.obituaries 
        WHERE slug = final_slug AND id != id_param
    ) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter::text;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Generate slugs for existing obituaries
UPDATE public.obituaries 
SET slug = generate_obituary_slug(ime, prezime, id)
WHERE slug IS NULL;

-- Create unique index on slug
CREATE UNIQUE INDEX idx_obituaries_slug ON public.obituaries(slug);

-- Create trigger to automatically generate slug for new obituaries
CREATE OR REPLACE FUNCTION trigger_generate_obituary_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := generate_obituary_slug(NEW.ime, NEW.prezime, NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER obituaries_slug_trigger
    BEFORE INSERT OR UPDATE ON public.obituaries
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_obituary_slug();