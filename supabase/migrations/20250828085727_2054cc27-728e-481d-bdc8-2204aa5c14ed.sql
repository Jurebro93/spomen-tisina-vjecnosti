-- Add meta description and title fields to tables that don't have them

-- Add meta fields to blogs table
ALTER TABLE public.blogs 
ADD COLUMN IF NOT EXISTS meta_title text,
ADD COLUMN IF NOT EXISTS meta_description text;

-- Add meta fields to groblja table
ALTER TABLE public.groblja 
ADD COLUMN IF NOT EXISTS meta_title text,
ADD COLUMN IF NOT EXISTS meta_description text;

-- Add meta fields to memorijalni_citati table
ALTER TABLE public.memorijalni_citati 
ADD COLUMN IF NOT EXISTS meta_title text,
ADD COLUMN IF NOT EXISTS meta_description text;

-- Add meta fields to newsletter_users table
ALTER TABLE public.newsletter_users 
ADD COLUMN IF NOT EXISTS meta_title text,
ADD COLUMN IF NOT EXISTS meta_description text;

-- Add meta fields to obituaries table
ALTER TABLE public.obituaries 
ADD COLUMN IF NOT EXISTS meta_title text,
ADD COLUMN IF NOT EXISTS meta_description text;

-- Add meta fields to pogrebna_poduzeca table
ALTER TABLE public.pogrebna_poduzeca 
ADD COLUMN IF NOT EXISTS meta_title text,
ADD COLUMN IF NOT EXISTS meta_description text;

-- Add meta fields to sprovodi table
ALTER TABLE public.sprovodi 
ADD COLUMN IF NOT EXISTS meta_title text,
ADD COLUMN IF NOT EXISTS meta_description text;

-- Add meta fields to virtual_candles table
ALTER TABLE public.virtual_candles 
ADD COLUMN IF NOT EXISTS meta_title text,
ADD COLUMN IF NOT EXISTS meta_description text;

-- Update existing records with default meta values where appropriate

-- Update blogs meta fields
UPDATE public.blogs 
SET 
  meta_title = COALESCE(meta_title, title),
  meta_description = COALESCE(meta_description, LEFT(excerpt, 160))
WHERE meta_title IS NULL OR meta_description IS NULL;

-- Update groblja meta fields
UPDATE public.groblja 
SET 
  meta_title = COALESCE(meta_title, naziv || ' - ' || grad),
  meta_description = COALESCE(meta_description, 'Informacije o groblju ' || naziv || ' u ' || grad || '. ' || LEFT(opis, 120))
WHERE meta_title IS NULL OR meta_description IS NULL;

-- Update memorijalni_citati meta fields
UPDATE public.memorijalni_citati 
SET 
  meta_title = COALESCE(meta_title, 'Memorijalni citat od ' || autor),
  meta_description = COALESCE(meta_description, LEFT(tekst, 160))
WHERE meta_title IS NULL OR meta_description IS NULL;

-- Update obituaries meta fields
UPDATE public.obituaries 
SET 
  meta_title = COALESCE(meta_title, ime || ' ' || prezime || ' - Osmrtnica'),
  meta_description = COALESCE(meta_description, 'Osmrtnica za ' || ime || ' ' || prezime || 
    CASE 
      WHEN datum_rodenja IS NOT NULL AND datum_smrti IS NOT NULL 
      THEN ' (' || EXTRACT(YEAR FROM datum_rodenja) || ' - ' || EXTRACT(YEAR FROM datum_smrti) || ')'
      ELSE ''
    END || 
    CASE 
      WHEN biografija IS NOT NULL 
      THEN '. ' || LEFT(biografija, 100)
      ELSE ''
    END)
WHERE meta_title IS NULL OR meta_description IS NULL;

-- Update pogrebna_poduzeca meta fields
UPDATE public.pogrebna_poduzeca 
SET 
  meta_title = COALESCE(meta_title, naziv || ' - Pogrebno poduzeće ' || grad),
  meta_description = COALESCE(meta_description, 'Pogrebno poduzeće ' || naziv || ' u ' || grad || '. Kontakt: ' || telefon || '. Ocjena: ' || ocjena || '/5')
WHERE meta_title IS NULL OR meta_description IS NULL;

-- Update sprovodi meta fields
UPDATE public.sprovodi 
SET 
  meta_title = COALESCE(meta_title, 'Sprovod ' || ime || ' ' || prezime),
  meta_description = COALESCE(meta_description, 'Sprovod za ' || ime || ' ' || prezime || ' u ' || grad || 
    CASE 
      WHEN datum_sprovoda IS NOT NULL 
      THEN ', datum sprovoda: ' || datum_sprovoda::text
      ELSE ''
    END)
WHERE meta_title IS NULL OR meta_description IS NULL;

-- Update virtual_candles meta fields
UPDATE public.virtual_candles 
SET 
  meta_title = COALESCE(meta_title, 'Virtualna svijeća za ' || pokojnik_ime || ' ' || pokojnik_prezime),
  meta_description = COALESCE(meta_description, 'Virtualna svijeća zapaljena za ' || pokojnik_ime || ' ' || pokojnik_prezime || 
    CASE 
      WHEN zapalio_ime IS NOT NULL 
      THEN ' od strane ' || zapalio_ime
      ELSE ''
    END ||
    CASE 
      WHEN poruka IS NOT NULL 
      THEN '. Poruka: ' || LEFT(poruka, 100)
      ELSE ''
    END)
WHERE meta_title IS NULL OR meta_description IS NULL;