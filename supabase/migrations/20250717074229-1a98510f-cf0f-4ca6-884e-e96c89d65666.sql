-- Create table for memorial garden quotes
CREATE TABLE public.memorijalni_citati (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tekst TEXT NOT NULL,
  autor TEXT NOT NULL,
  relacija TEXT,
  email_autora TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_komentar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by TEXT
);

-- Enable Row Level Security
ALTER TABLE public.memorijalni_citati ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing approved quotes
CREATE POLICY "Anyone can view approved quotes" 
ON public.memorijalni_citati 
FOR SELECT 
USING (status = 'approved');

-- Create policy for inserting new quotes (pending approval)
CREATE POLICY "Anyone can submit quotes for approval" 
ON public.memorijalni_citati 
FOR INSERT 
WITH CHECK (status = 'pending');

-- Create policy for admin updates (service role)
CREATE POLICY "Service role can update all quotes" 
ON public.memorijalni_citati 
FOR UPDATE 
USING (true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_memorijalni_citati_updated_at
BEFORE UPDATE ON public.memorijalni_citati
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some approved test quotes
INSERT INTO public.memorijalni_citati (tekst, autor, relacija, status, approved_at, approved_by) VALUES
('Dragi kolega, hvala ti za sve godine suradnje i prijateljstva. Počivaj u miru.', 'Zdravko', 'Kolega', 'approved', now(), 'admin'),
('Bila si najbolja mama na svijetu. Nedostaješ nam svakim danom.', 'Ana i Marko', 'Djeca', 'approved', now(), 'admin'),
('Pamtit ćemo te kao čovjeka velikog srca koji je uvijek bio spreman pomoći.', 'Susjedstvo', 'Prijatelji', 'approved', now(), 'admin'),
('Vaša dobrota i mudrost ostat će s nama zauvijek. Počivajte u miru.', 'Obitelj Novak', 'Obitelj', 'approved', now(), 'admin'),
('Odlasciš nam, ali ostavljaš trag ljubavi u našim srcima.', 'Marija', 'Prijateljica', 'approved', now(), 'admin'),
('Bio si ponosni otac i djed. Hvala ti za sve što si nas naučio.', 'Unuci', 'Obitelj', 'approved', now(), 'admin'),
('Nikad neću zaboraviti tvoj osmijeh i toplinu. Do ponovnog viđenja.', 'Petra', 'Prijateljica', 'approved', now(), 'admin'),
('Zahvaljujemo ti za sve lijepe trenutke koje smo zajedno proveli.', 'Razred 7.b', 'Učenici', 'approved', now(), 'admin');