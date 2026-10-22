-- A second free guide ("Obiteljska mirovina korak po korak"): one signup row per address and guide.
-- Existing rows all belong to the first guide.
ALTER TABLE public.ebook_signups
  ADD COLUMN IF NOT EXISTS guide text NOT NULL DEFAULT 'kad-izgubite-voljenu-osobu';
ALTER TABLE public.ebook_signups DROP CONSTRAINT IF EXISTS ebook_signups_email_key;
ALTER TABLE public.ebook_signups
  ADD CONSTRAINT ebook_signups_email_guide_key UNIQUE (email, guide);
