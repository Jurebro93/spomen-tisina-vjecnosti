-- Create obituaries table
CREATE TABLE public.obituaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ime TEXT NOT NULL,
  prezime TEXT NOT NULL,
  datum_rodenja DATE NOT NULL,
  datum_smrti DATE NOT NULL,
  mjesto_rodenja TEXT NOT NULL,
  mjesto_smrti TEXT NOT NULL,
  biografija TEXT,
  fotografija_url TEXT,
  kontakt_osoba_ime TEXT NOT NULL,
  kontakt_osoba_email TEXT NOT NULL,
  kontakt_osoba_telefon TEXT,
  stripe_payment_intent_id TEXT,
  paid BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.obituaries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active paid obituaries"
ON public.obituaries
FOR SELECT
USING (active = true AND paid = true);

CREATE POLICY "Anyone can insert obituaries"
ON public.obituaries
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update payment status"
ON public.obituaries
FOR UPDATE
USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_obituaries_updated_at
  BEFORE UPDATE ON public.obituaries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();