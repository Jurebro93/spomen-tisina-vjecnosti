-- Create table for funeral companies (pogrebna poduzeća)
CREATE TABLE public.pogrebna_poduzeca (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  naziv TEXT NOT NULL,
  ocjena DECIMAL(2,1) NOT NULL,
  broj_recenzija INTEGER NOT NULL DEFAULT 0,
  telefon TEXT NOT NULL,
  adresa TEXT NOT NULL,
  website_url TEXT NOT NULL,
  usluge TEXT[] NOT NULL DEFAULT '{}',
  cijena TEXT NOT NULL,
  dostupno BOOLEAN NOT NULL DEFAULT true,
  grad TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pogrebna_poduzeca ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Public read access to pogrebna_poduzeca"
ON public.pogrebna_poduzeca
FOR SELECT
USING (true);

-- Block public write access
CREATE POLICY "Block public write access to pogrebna_poduzeca"
ON public.pogrebna_poduzeca
FOR ALL
USING (false)
WITH CHECK (false);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pogrebna_poduzeca_updated_at
  BEFORE UPDATE ON public.pogrebna_poduzeca
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert data for Zagreb
INSERT INTO public.pogrebna_poduzeca (naziv, ocjena, broj_recenzija, telefon, adresa, website_url, usluge, cijena, dostupno, grad) VALUES
('Pogrebno poduzeće Pietas', 4.8, 156, '01/4667-300', 'Savska cesta 25, 10000 Zagreb', 'https://www.pietas.hr', ARRAY['Kompletna organizacija', 'Prijevoz', 'Cvijeće', 'Glazba'], 'od 1.200 €', true, 'zagreb'),
('Pogrebno poduzeće Mirogoj', 4.6, 234, '01/4699-400', 'Hermann Bolle 27, 10000 Zagreb', 'https://www.mirogoj.hr', ARRAY['Standardne usluge', 'Grobna mjesta', 'Spomenici'], 'od 900 €', true, 'zagreb'),
('Pogrebno poduzeće Arkada Centar', 4.4, 89, '01/3777-200', 'Ilica 15, 10000 Zagreb', 'https://www.arkada-centar.hr', ARRAY['VIP usluge', 'Međunarodni prijevoz', 'Kremacija'], 'od 1.800 €', true, 'zagreb'),
('Pogrebno poduzeće Zagreb', 4.7, 312, '01/4848-200', 'Vlaška 50, 10000 Zagreb', 'https://pogrebno-poduzece-zagreb.hr', ARRAY['Kompletna organizacija', 'Prijevoz', 'Cvijeće', 'Glazba'], 'od 1.100 €', true, 'zagreb');

-- Insert data for Split
INSERT INTO public.pogrebna_poduzeca (naziv, ocjena, broj_recenzija, telefon, adresa, website_url, usluge, cijena, dostupno, grad) VALUES
('Pogrebno poduzeće Lovrinac', 4.9, 203, '021/344-200', 'Poljička cesta 35, 21000 Split', 'https://www.lovrinac.hr', ARRAY['Kompletna organizacija', 'Prijevoz', 'Cvijeće', 'Glazba'], 'od 1.300 €', true, 'split'),
('Pogrebno poduzeće Kvaternik', 4.6, 167, '021/525-300', 'Vukovarska 15, 21000 Split', 'https://www.kvaternik.hr', ARRAY['Standardne usluge', 'Grobna mjesta'], 'od 1.000 €', true, 'split'),
('Bila ruža - Pogrebno poduzeće', 4.7, 134, '021/326-256', 'Spinčićeva 7, 21000 Split', 'https://bilaruza.com', ARRAY['VIP usluge', 'Kremacija', 'Međunarodni prijevoz'], 'od 1.500 €', true, 'split'),
('Pogrebno poduzeće Piramida', 4.5, 178, '021/489-400', 'Matoševa 10, 21000 Split', 'https://www.piramida-pogrebno.hr', ARRAY['Kompletna organizacija', 'Cvjećarnica', 'Prijevoz'], 'od 1.050 €', true, 'split');

-- Insert data for Rijeka
INSERT INTO public.pogrebna_poduzeca (naziv, ocjena, broj_recenzija, telefon, adresa, website_url, usluge, cijena, dostupno, grad) VALUES
('Pogrebno poduzeće Trsat', 4.7, 124, '051/335-400', 'Žabica 2, 51000 Rijeka', 'https://www.trsat.hr', ARRAY['Kompletna organizacija', 'Prijevoz', 'Cvijeće'], 'od 1.100 €', true, 'rijeka'),
('Pogrebno poduzeće Kozala', 4.5, 78, '051/214-300', 'Kozala 1, 51000 Rijeka', 'https://www.kozala.hr', ARRAY['Standardne usluge', 'Grobna mjesta', 'Spomenici'], 'od 800 €', true, 'rijeka'),
('Pogrebno poduzeće Adriatic', 4.6, 95, '051/372-600', 'Drenova 5, 51000 Rijeka', 'https://www.adriatic-pogreb.hr', ARRAY['VIP usluge', 'Međunarodni prijevoz'], 'od 1.350 €', true, 'rijeka'),
('Pogrebno poduzeće Kvarner', 4.4, 102, '051/456-789', 'Krešimirova 15, 51000 Rijeka', 'https://www.kvarner-pogreb.hr', ARRAY['Kompletna organizacija', 'Prijevoz', 'Cvijeće'], 'od 1.000 €', true, 'rijeka');

-- Insert data for Zadar
INSERT INTO public.pogrebna_poduzeca (naziv, ocjena, broj_recenzija, telefon, adresa, website_url, usluge, cijena, dostupno, grad) VALUES
('Pogrebno poduzeće Skroče', 4.9, 287, '023/212-600', 'Narodnog trga 5, 23000 Zadar', 'https://www.skroce.hr', ARRAY['Kompletna organizacija', 'Prijevoz', 'Cvijeće', 'Glazba'], 'od 1.200 €', true, 'zadar'),
('Pogrebno poduzeće Zadar', 4.6, 156, '023/334-200', 'Božidara Adžije 10, 23000 Zadar', 'https://www.pogreb-zadar.hr', ARRAY['Standardne usluge', 'Grobna mjesta', 'Spomenici'], 'od 1.000 €', true, 'zadar'),
('Pogrebno poduzeće Dalmacija', 4.5, 134, '023/456-300', 'Široka ulica 12, 23000 Zadar', 'https://www.dalmacija-zadar.hr', ARRAY['VIP usluge', 'Međunarodni prijevoz', 'Kremacija'], 'od 1.450 €', true, 'zadar'),
('Pogrebno poduzeće Nasadi', 4.4, 98, '023/789-400', 'Biogradska cesta 45, 23000 Zadar', 'https://nasadi.hr', ARRAY['Kompletna organizacija', 'Grobna mjesta', 'Prijevoz'], 'od 1.050 €', true, 'zadar');

-- Insert data for Osijek
INSERT INTO public.pogrebna_poduzeca (naziv, ocjena, broj_recenzija, telefon, adresa, website_url, usluge, cijena, dostupno, grad) VALUES
('Pogrebno poduzeće Ukop Osijek', 4.7, 198, '031/205-400', 'Europska avenija 24, 31000 Osijek', 'https://ukop-osijek.hr', ARRAY['Kompletna organizacija', 'Prijevoz', 'Cvijeće'], 'od 1.100 €', true, 'osijek'),
('Pogrebno poduzeće Slavonija', 4.5, 134, '031/456-200', 'Kapucinska 15, 31000 Osijek', 'https://www.slavonija-pogreb.hr', ARRAY['Standardne usluge', 'Grobna mjesta', 'Spomenici'], 'od 900 €', true, 'osijek'),
('Pogrebno poduzeće Drava', 4.6, 156, '031/789-300', 'Stjepana Radića 22, 31000 Osijek', 'https://www.drava-pogreb.hr', ARRAY['VIP usluge', 'Međunarodni prijevoz'], 'od 1.300 €', true, 'osijek');

-- Insert data for Pula
INSERT INTO public.pogrebna_poduzeca (naziv, ocjena, broj_recenzija, telefon, adresa, website_url, usluge, cijena, dostupno, grad) VALUES
('Pogrebno poduzeće Istra', 4.6, 123, '052/211-400', 'Istarska 8, 52100 Pula', 'https://www.istra-pogreb.hr', ARRAY['Kompletna organizacija', 'Prijevoz', 'Cvijeće'], 'od 1.050 €', true, 'pula'),
('Pogrebno poduzeće Arena', 4.4, 89, '052/456-200', 'Carrarina 12, 52100 Pula', 'https://www.arena-pogreb.hr', ARRAY['Standardne usluge', 'Grobna mjesta'], 'od 1.000 €', true, 'pula'),
('Pogrebno poduzeće Histria', 4.5, 102, '052/789-300', 'Flanatička 25, 52100 Pula', 'https://www.histria-pogreb.hr', ARRAY['VIP usluge', 'Međunarodni prijevoz'], 'od 1.200 €', true, 'pula');