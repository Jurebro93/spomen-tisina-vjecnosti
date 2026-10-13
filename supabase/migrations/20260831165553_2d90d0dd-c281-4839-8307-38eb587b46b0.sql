ALTER TABLE public.memorials
  ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone;

-- Existing published memorials are treated as already paid so nothing breaks.
UPDATE public.memorials SET paid = true, paid_at = COALESCE(published_at, now())
WHERE status = 'published' AND paid = false;

CREATE OR REPLACE FUNCTION public.enforce_memorial_paid_before_publish()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'published' AND COALESCE(NEW.paid, false) = false THEN
    RAISE EXCEPTION 'Memorijal se može objaviti samo nakon uspješne uplate.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS memorials_require_payment ON public.memorials;
CREATE TRIGGER memorials_require_payment
BEFORE INSERT OR UPDATE ON public.memorials
FOR EACH ROW EXECUTE FUNCTION public.enforce_memorial_paid_before_publish();