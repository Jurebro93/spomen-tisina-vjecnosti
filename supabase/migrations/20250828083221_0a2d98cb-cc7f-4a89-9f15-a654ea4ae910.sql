-- Create Blog table
CREATE TABLE public.blogs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  excerpt text NOT NULL,
  content text,
  date text NOT NULL,
  category text NOT NULL,
  featured boolean NOT NULL DEFAULT false,
  image_url text,
  slug text UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Everyone can read blogs" 
ON public.blogs 
FOR SELECT 
USING (true);

-- Block public write access
CREATE POLICY "Block public write access to blogs" 
ON public.blogs 
FOR ALL 
USING (false)
WITH CHECK (false);

-- Service role can do everything
CREATE POLICY "Service role full access to blogs" 
ON public.blogs 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create function to generate blog slug
CREATE OR REPLACE FUNCTION public.generate_blog_slug(title_param text, id_param uuid)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    base_slug text;
    final_slug text;
    counter integer := 0;
BEGIN
    -- Create base slug from title
    base_slug := lower(trim(both from title_param));
    
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
        SELECT 1 FROM public.blogs 
        WHERE slug = final_slug AND id != id_param
    ) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter::text;
    END LOOP;
    
    RETURN final_slug;
END;
$function$;

-- Create trigger to auto-generate slug
CREATE OR REPLACE FUNCTION public.trigger_generate_blog_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := generate_blog_slug(NEW.title, NEW.id);
    END IF;
    RETURN NEW;
END;
$function$;

CREATE TRIGGER generate_blog_slug_trigger
    BEFORE INSERT OR UPDATE ON public.blogs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_blog_slug();

-- Create trigger for updating updated_at column
CREATE TRIGGER update_blogs_updated_at
    BEFORE UPDATE ON public.blogs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert all existing blog posts
INSERT INTO public.blogs (id, title, excerpt, date, category, featured) VALUES
(gen_random_uuid(), 'Euharistija kao Očitanje Božanske Slave u Svakodnevnom Kruh i Vinu', 'Slava Gospodnja i simbolika oblačnog ognja U knjizi Izlaska 24, slava Gospodnja se prikazuje kao "konzumirajuća vatra" na vrhu brda Sinaj. Obavijena oblakom, ova slava', '25. lipnja 2025', 'Vjerski tekstovi', true),
(gen_random_uuid(), 'Isusova Uloga u Osnivanju Crkve: Perspektive Katolika i Protestanata', 'Je li Isus osnovao Crkvu? Pitanje koje se često postavlja jest je li Isus doista osnovao Crkvu kako tvrdi tradicija Katoličke crkve. Mnogi vjeruju da', '24. lipnja 2025', 'Vjerski tekstovi', false),
(gen_random_uuid(), 'Petrova Ključna Uloga u Kristovoj Crkvi: Otkrovenje i Temelj Papinske Sukcesije', 'Isus kao Kralj i Petar kao "Stijena" Jedna od najkontroverznijih i najzanimljivih priča u Bibliji odnosi se na način na koji je Isus prepoznao Simona', '23. lipnja 2025', 'Vjerski tekstovi', false),
(gen_random_uuid(), 'Simbolika Gorućeg Grma kao Predslika Utjelovljenja Krista', 'Simbolika Gorućeg Grma i Krista U središtu priče o gorućem grmu iz Izlaska 3:1-6, gdje se Mojsiju predstavlja Božja prisutnost, vidimo kako se ova manifestacija', '22. lipnja 2025', 'Vjerski tekstovi', false),
(gen_random_uuid(), 'Euharistija: Kršćanska Služba Bogoslužja i Njezin Duboki Značaj', 'Razumijevanje euharistije kroz prizmu kršćanske tradicije i njezin značaj u vjerskom životu vjernika.', '21. lipnja 2025', 'Vjerski tekstovi', false),
(gen_random_uuid(), 'Tradicije Oprosta i Njihova Važnost u Hrvatskom Društvu', 'Kako se tradicije vezane uz pokojnike prenose kroz generacije i koliku važnost imaju u modernom hrvatskom društvu.', '20. lipnja 2025', 'Tradicija', false),
(gen_random_uuid(), 'Molitva za Pokojne: Važnost Duhovne Podrške', 'Kako molitve za pokojne pružaju utjehu obiteljima i prijateljima u trenucima tuge i žalovanja.', '19. lipnja 2025', 'Vjerski tekstovi', false),
(gen_random_uuid(), 'Crkveni Obredi i Tradicija Sahrane u Hrvaški', 'Pregled tradicionalnih crkvenih obreda koji se provode tijekom sahrane u hrvatskome kulturnom kontekstu.', '18. lipnja 2025', 'Tradicija', false),
(gen_random_uuid(), 'Žalovanje: Proces Prihvaćanja Gubitka Voljene Osobe', 'Psihološki aspekti žalovanja i kako se nositi s gubitkom bliske osobe kroz različite faze tuge.', '17. lipnja 2025', 'Psihologija', false),
(gen_random_uuid(), 'Komemorativni Objekti: Čuvanje Sjećanja na Pokojne', 'Različiti načini čuvanja sjećanja na pokojne kroz komemorativne objekte i njihova važnost za obitelji.', '16. lipnja 2025', 'Tradicija', false),
(gen_random_uuid(), 'Glazba u Pogrebnim Obredima: Značaj i Tradicija', 'Uloga crkvene i tradicionalne glazbe u pogrebnim obredima i kako glazba pomaže u procesu žalovanja.', '15. lipnja 2025', 'Tradicija', false),
(gen_random_uuid(), 'Biblijski Stavovi o Smrti i Uskrsnuću', 'Što Biblija govori o smrti, uskrsnuću i vječnom životu prema kršćanskom učenju.', '14. lipnja 2025', 'Vjerski tekstovi', false),
(gen_random_uuid(), 'Moderni Pristupi Komemoraciji i Sjećanju', 'Kako se tradicionalni načini komemoracije prilagođavaju modernom vremenu i digitalnoj eri.', '13. lipnja 2025', 'Moderna doba', false),
(gen_random_uuid(), 'Utjeha u Vjeri: Kako Vjera Pomaže u Teškim Trenucima', 'Uloga vjere i duhovnosti u pružanju utjehe i snage tijekom razdoblja gubitka i žalovanja.', '12. lipnja 2025', 'Vjerski tekstovi', false),
(gen_random_uuid(), 'Obiteljske Tradicije Sjećanja kroz Generacije', 'Kako se obiteljske tradicije vezane uz pokojne prenose i čuvaju kroz različite generacije.', '11. lipnja 2025', 'Tradicija', false);