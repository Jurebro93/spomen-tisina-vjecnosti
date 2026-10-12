-- Add missing columns to obituaries table
ALTER TABLE public.obituaries ADD COLUMN groblje TEXT;
ALTER TABLE public.obituaries ADD COLUMN datum_ukopa TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.obituaries ADD COLUMN vrijeme_ukopa TEXT;
ALTER TABLE public.obituaries ADD COLUMN ozalosceni TEXT[];
ALTER TABLE public.obituaries ADD COLUMN mjesna_zajednica TEXT;
ALTER TABLE public.obituaries ADD COLUMN profesija TEXT;
ALTER TABLE public.obituaries ADD COLUMN podnaslov TEXT;