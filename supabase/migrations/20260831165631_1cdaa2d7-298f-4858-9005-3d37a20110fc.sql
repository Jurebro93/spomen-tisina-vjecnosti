CREATE OR REPLACE FUNCTION public.enforce_memorial_paid_before_publish()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Only the server (service role, no auth.uid()) may mark a memorial as paid.
  IF TG_OP = 'UPDATE' AND COALESCE(NEW.paid, false) IS DISTINCT FROM COALESCE(OLD.paid, false)
     AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Status uplate mogu mijenjati samo Lovable/Stripe servisi.';
  END IF;

  IF TG_OP = 'INSERT' AND COALESCE(NEW.paid, false) = true AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Status uplate mogu mijenjati samo Lovable/Stripe servisi.';
  END IF;

  IF NEW.status = 'published' AND COALESCE(NEW.paid, false) = false THEN
    RAISE EXCEPTION 'Memorijal se može objaviti samo nakon uspješne uplate.';
  END IF;

  RETURN NEW;
END;
$$;