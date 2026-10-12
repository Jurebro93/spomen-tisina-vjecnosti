-- Update slug generation functions to remove redundant words

-- Updated function for pogrebna poduzeća - remove "pogrebno poduzeće" from naziv
CREATE OR REPLACE FUNCTION public.generate_pogrebno_poduzece_slug(naziv_param text, id_param uuid)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $$
DECLARE
    base_slug text;
    final_slug text;
    counter integer := 0;
BEGIN
    -- Create base slug from naziv and clean it
    base_slug := lower(trim(both from naziv_param));
    
    -- Remove "pogrebno poduzeće", "pogrebno poduzece", "poduzeće", "poduzece" etc.
    base_slug := regexp_replace(base_slug, 'pogrebno\s+poduze[cć]e\s*', '', 'gi');
    base_slug := regexp_replace(base_slug, 'poduze[cć]e\s*', '', 'gi');
    base_slug := regexp_replace(base_slug, 'pogrebno\s*', '', 'gi');
    
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
        SELECT 1 FROM public.pogrebna_poduzeca 
        WHERE slug = final_slug AND id != id_param
    ) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter::text;
    END LOOP;
    
    RETURN final_slug;
END;
$$;

-- Updated function for groblja - remove "groblje" from naziv
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
    -- Create base slug from naziv and clean it
    base_slug := lower(trim(both from naziv_param));
    
    -- Remove "groblje" from the name
    base_slug := regexp_replace(base_slug, 'groblje\s*', '', 'gi');
    
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

-- Regenerate slugs for existing records
UPDATE public.pogrebna_poduzeca 
SET slug = generate_pogrebno_poduzece_slug(naziv, id);

UPDATE public.groblja 
SET slug = generate_groblje_slug(naziv, id);