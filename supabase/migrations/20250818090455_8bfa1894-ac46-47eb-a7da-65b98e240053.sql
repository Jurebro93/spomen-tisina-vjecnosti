-- Create table for cemeteries
CREATE TABLE public.groblja (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  naziv TEXT NOT NULL,
  opis TEXT NOT NULL,
  godina_osnivanja TEXT NOT NULL,
  grad TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.groblja ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access (no authentication required)
CREATE POLICY "Public read access to groblja" 
ON public.groblja 
FOR SELECT 
USING (true);

-- Create policy to block all other operations for public
CREATE POLICY "Block public write access to groblja" 
ON public.groblja 
FOR ALL 
USING (false)
WITH CHECK (false);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_groblja_updated_at
BEFORE UPDATE ON public.groblja
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert all cemetery data
INSERT INTO public.groblja (naziv, opis, godina_osnivanja, grad) VALUES 
-- Zagreb
('Mirogoj', 'Glavno gradsko groblje, poznato po svojoj arhitekturi i parkovnim površinama', '1876.', 'zagreb'),
('Maksimir', 'Groblje u istočnom dijelu grada, mirno i dostupno', '1926.', 'zagreb'),
('Resnički Gaj', 'Novo groblje u južnom dijelu grada', '1985.', 'zagreb'),
('Markuševec', 'Groblje u sjevernom dijelu grada', '1990.', 'zagreb'),
('Granešina', 'Groblje u istočnom dijelu grada', '1970.', 'zagreb'),

-- Split
('Lovrinac', 'Glavno gradsko groblje, smješteno na brju s pogledom na more', '1889.', 'split'),
('Kocunar', 'Novo groblje u zapadnom dijelu grada', '1960.', 'split'),
('Žnjan', 'Groblje u istočnom dijelu grada', '1975.', 'split'),
('Sućidar', 'Groblje u Sućidru, dio Splita', '1950.', 'split'),

-- Rijeka
('Kozala', 'Glavno gradsko groblje, najveće u gradu', '1896.', 'rijeka'),
('Drenova', 'Groblje u naselju Drenova', '1925.', 'rijeka'),
('Trsat', 'Groblje u Trsatu, na uzvisini', '1880.', 'rijeka'),
('Sušak', 'Groblje u Sušaku, desna strana grada', '1920.', 'rijeka'),

-- Osijek
('Novo groblje', 'Glavno gradsko groblje, najveće u gradu', '1895.', 'osijek'),
('Staro groblje', 'Povijesno groblje u centru grada', '1740.', 'osijek'),
('Jug II', 'Groblje u južnom dijelu grada', '1960.', 'osijek'),
('Vijenac', 'Groblje u naselju Vijenac', '1970.', 'osijek'),

-- Zadar
('Borik', 'Glavno gradsko groblje, smješteno u borićima', '1898.', 'zadar'),
('Relja', 'Groblje u naselju Relja', '1930.', 'zadar'),
('Diklo', 'Groblje u Diklu, dio Zadra', '1925.', 'zadar'),
('Arbanasi', 'Groblje u Arbanasima', '1950.', 'zadar'),

-- Dubrovnik
('Boninovo', 'Glavno gradsko groblje, s pogledom na Jadransko more', '1884.', 'dubrovnik'),
('Suđurađ', 'Groblje na Šipanu', '1920.', 'dubrovnik'),
('Lopud', 'Groblje na otoku Lopud', '1890.', 'dubrovnik'),
('Koločep', 'Groblje na otoku Koločep', '1900.', 'dubrovnik'),

-- Pula
('Valelunga', 'Glavno gradsko groblje, najveće u gradu', '1885.', 'pula'),
('Šijana', 'Groblje u naselju Šijana', '1950.', 'pula'),
('Valdebek', 'Groblje u Valdebeku', '1960.', 'pula'),
('Fažana', 'Groblje u Fažani', '1880.', 'pula'),

-- Karlovac
('Novo groblje', 'Glavno gradsko groblje', '1895.', 'karlovac'),
('Staro groblje', 'Povijesno groblje u centru grada', '1750.', 'karlovac'),
('Turanj', 'Groblje u Turnju', '1920.', 'karlovac'),
('Korana', 'Groblje uz rijeku Koranu', '1960.', 'karlovac');