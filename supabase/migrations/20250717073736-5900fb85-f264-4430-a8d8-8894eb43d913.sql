-- Create sprovodi table to track funeral/burial information
CREATE TABLE public.sprovodi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ime TEXT NOT NULL,
  prezime TEXT NOT NULL,
  datum_rodenja DATE NOT NULL,
  datum_smrti DATE NOT NULL,
  godina INTEGER,
  groblje TEXT NOT NULL,
  grad TEXT NOT NULL,
  lokacija TEXT NOT NULL,
  tip_sprovoda TEXT NOT NULL CHECK (tip_sprovoda IN ('Sprovod', 'Ispraćaj', 'Kremacija')),
  datum_sprovoda DATE NOT NULL,
  vrijeme_sprovoda TIME NOT NULL,
  dvorana TEXT,
  parcel TEXT,
  broj_groba TEXT,
  kontakt_osoba_ime TEXT,
  kontakt_osoba_telefon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sprovodi ENABLE ROW LEVEL SECURITY;

-- Create policy for public viewing of active sprovodi
CREATE POLICY "Anyone can view sprovodi" 
ON public.sprovodi 
FOR SELECT 
USING (true);

-- Create policy for inserting sprovodi (for admin use)
CREATE POLICY "Service role can insert sprovodi" 
ON public.sprovodi 
FOR INSERT 
WITH CHECK (true);

-- Create policy for updating sprovodi (for admin use)
CREATE POLICY "Service role can update sprovodi" 
ON public.sprovodi 
FOR UPDATE 
USING (true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_sprovodi_updated_at
BEFORE UPDATE ON public.sprovodi
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert test data for the last 7 days
INSERT INTO public.sprovodi (ime, prezime, datum_rodenja, datum_smrti, godina, groblje, grad, lokacija, tip_sprovoda, datum_sprovoda, vrijeme_sprovoda, dvorana, parcel, broj_groba, kontakt_osoba_ime, kontakt_osoba_telefon) VALUES
-- Zagreb
('Ana', 'Marić', '1934-03-15', '2025-01-15', 90, 'Mirogoj', 'Zagreb', 'Mirogoj – Ispraćajni Trg Krematorij', 'Sprovod', '2025-01-18', '09:00', 'Velika dvorana', 'A-15', '234', 'Marko Marić', '+385 91 123 4567'),
('Petar', 'Novak', '1942-07-20', '2025-01-16', 82, 'Mirogoj', 'Zagreb', 'Mirogoj – Ispraćajni Trg Krematorij', 'Sprovod', '2025-01-18', '10:10', 'Velika dvorana', 'B-22', '156', 'Kata Novak', '+385 92 234 5678'),
('Milica', 'Horvat', '1930-12-03', '2025-01-14', 94, 'Maksimir', 'Zagreb', 'Maksimir', 'Sprovod', '2025-01-18', '11:55', 'Glavna dvorana', 'C-8', '89', 'Ivo Horvat', '+385 93 345 6789'),
('Josip', 'Kovač', '1948-09-20', '2025-01-14', 76, 'Mirogoj', 'Zagreb', 'Krematorij Velika Dvorana', 'Ispraćaj', '2025-01-18', '13:05', 'Krematorij', null, null, 'Ana Kovač', '+385 94 456 7890'),

-- Split
('Ante', 'Perić', '1946-05-12', '2025-01-15', 78, 'Lovrinac', 'Split', 'Lovrinac', 'Sprovod', '2025-01-18', '09:30', 'Glavna dvorana', 'D-12', '67', 'Marija Perić', '+385 95 567 8901'),
('Kata', 'Vuković', '1939-11-08', '2025-01-16', 85, 'Lovrinac', 'Split', 'Lovrinac', 'Sprovod', '2025-01-18', '10:30', 'Glavna dvorana', 'E-5', '123', 'Petar Vuković', '+385 96 678 9012'),
('Ivo', 'Matić', '1957-04-25', '2025-01-15', 67, 'Kocunar', 'Split', 'Kocunar', 'Sprovod', '2025-01-18', '11:30', 'Bočna dvorana', 'F-18', '45', 'Nada Matić', '+385 97 789 0123'),

-- Rijeka
('Nikola', 'Jurić', '1943-08-14', '2025-01-15', 81, 'Kozala', 'Rijeka', 'Kozala', 'Sprovod', '2025-01-18', '10:00', 'Centralna dvorana', 'G-9', '78', 'Vesna Jurić', '+385 98 890 1234'),
('Damir', 'Horvat', '1966-12-05', '2025-01-16', 58, 'Kozala', 'Rijeka', 'Kozala', 'Sprovod', '2025-01-18', '11:00', 'Centralna dvorana', 'H-14', '102', 'Lidija Horvat', '+385 99 901 2345'),

-- Osijek  
('Jelena', 'Kovačević', '1951-06-18', '2025-01-15', 73, 'Novo groblje', 'Osijek', 'Novo groblje', 'Sprovod', '2025-01-18', '09:00', 'Glavna kapela', 'I-7', '56', 'Milan Kovačević', '+385 91 012 3456'),
('Božidar', 'Marić', '1936-10-22', '2025-01-16', 88, 'Novo groblje', 'Osijek', 'Novo groblje', 'Sprovod', '2025-01-18', '10:00', 'Glavna kapela', 'J-11', '189', 'Milka Marić', '+385 92 123 4567'),

-- Zadar
('Tomislav', 'Babić', '1958-02-14', '2025-01-15', 66, 'Borik', 'Zadar', 'Borik', 'Sprovod', '2025-01-18', '10:00', 'Kapela sv. Ante', 'K-3', '34', 'Anica Babić', '+385 93 234 5678');