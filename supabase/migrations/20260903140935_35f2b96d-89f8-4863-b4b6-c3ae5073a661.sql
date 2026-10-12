ALTER TABLE public.memorials
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS invoice_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS invoice_email text;

CREATE SEQUENCE IF NOT EXISTS public.memorial_invoice_seq START 1;
GRANT USAGE, SELECT ON SEQUENCE public.memorial_invoice_seq TO service_role;