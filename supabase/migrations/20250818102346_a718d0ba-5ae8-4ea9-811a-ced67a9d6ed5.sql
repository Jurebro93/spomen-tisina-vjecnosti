-- Create table for on-page SEO metadata
CREATE TABLE public.on_page_seo (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  page_path text NOT NULL UNIQUE,
  meta_title text NOT NULL,
  meta_description text NOT NULL,
  CONSTRAINT meta_title_length CHECK (char_length(meta_title) <= 65),
  CONSTRAINT meta_description_length CHECK (char_length(meta_description) <= 160)
);

-- Enable RLS
ALTER TABLE public.on_page_seo ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Public read access to on_page_seo" 
ON public.on_page_seo 
FOR SELECT 
USING (true);

-- Create policy to block public write access
CREATE POLICY "Block public write access to on_page_seo" 
ON public.on_page_seo 
FOR ALL 
USING (false) 
WITH CHECK (false);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_on_page_seo_updated_at
BEFORE UPDATE ON public.on_page_seo
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert SEO data for all pages
INSERT INTO public.on_page_seo (page_path, meta_title, meta_description) VALUES
('/', 'Osmrtnice Hrvatska | Objava osmrtnica i memorijalni sadržaj', 'Objavljujte osmrtnice, zapalite virtualne svijeće i dijelite uspomene. Najveća baza osmrtnica u Hrvatskoj s podrškom za obitelji.'),
('/blog', 'Blog | Savjeti i podrška za obitelji - Osmrtnice Hrvatska', 'Korisni članci, savjeti i informacije za lakše nošenje s gubitkom. Stručni sadržaj o žalovanju, organizaciji sprovoda i podršci.'),
('/cesto-postavljena-pitanja', 'Često postavljena pitanja | Osmrtnice Hrvatska', 'Odgovori na najčešća pitanja o objavljivanju osmrtnica, virtualnim svijećama i korištenju naše platforme.'),
('/informacije', 'Informacije i podrška | Korisni resursi - Osmrtnice', 'Detaljne informacije o objavljivanju osmrtnica, organizaciji sprovoda i dostupnim uslugama za obitelji u žalovanju.'),
('/kako-objaviti-osmrtnicu', 'Kako objaviti osmrtnicu | Vodič korak po korak', 'Jednostavan vodič za objavljivanje osmrtnice online. Savjeti za pisanje, fotografije i sve što trebate znati.'),
('/memorijalni-vrt', 'Memorijalni vrt | Citati i sjećanja - Osmrtnice Hrvatska', 'Pročitajte lijepe memorijalne citate i podijelite vlastita sjećanja. Mjesto za tišinu i razmišljanje o voljenima.'),
('/objavi-osmrtnicu', 'Objavi osmrtnicu | Brzo i jednostavno - Osmrtnice', 'Objavite osmrtnicu u nekoliko koraka. Dosegnite široku publiku i omogućite prijateljima da se oprosté.'),
('/sprovodi', 'Sprovodi | Pretraživanje sprovoda u Hrvatskoj', 'Pretražite sprovode po gradovima i datumima. Informacije o vremenu i mjestu sprovoda diljem Hrvatske.'),
('/umrli', 'Umrli | Pretraživanje osmrtnica - Osmrtnice Hrvatska', 'Pretražite osmrtnice po imenu, prezimenu ili mjestu. Najveća baza osmrtnica s mogućnošću filtriranja.'),
('/virtualne-svijece', 'Virtualne svijeće | Zapalite svijeću sjećanja online', 'Zapalite virtualnu svijeću za vaše najmilije. Ostavite poruku sjećanja i podijelite uspomene s drugim.'),
('/zapali-svijecu', 'Zapali svijeću | Stvori virtualnu svijeću sjećanja', 'Stvorite novu virtualnu svijeću za voljenu osobu. Dodajte osobnu poruku i zapamtite lijepe trenutke.');