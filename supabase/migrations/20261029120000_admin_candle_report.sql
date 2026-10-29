-- Candle Stripe Checkout sessions for Admin -> Statistika (candles are paid since 2026-10-28).
-- A checkout row is created by create-candle-payment with the session id (cs_live_/cs_test_),
-- so every row with a session id is one started checkout. Relights only keep the latest
-- session id on the original candle and cannot be dated, so they are not counted here.
CREATE OR REPLACE FUNCTION public.admin_candle_report(_from timestamptz, _to timestamptz, _livemode boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Zabranjeno'; END IF;

  WITH c AS (
    SELECT 'obituary' AS kind, created_at, paid AS is_paid, amount_paid
    FROM public.virtual_candles
    WHERE stripe_payment_intent_id LIKE (CASE WHEN _livemode THEN 'cs_live_%' ELSE 'cs_test_%' END)
      AND created_at >= _from AND created_at < _to
    UNION ALL
    SELECT 'memorial', created_at, payment_status = 'paid', amount_paid
    FROM public.memorial_candles
    WHERE stripe_session_id LIKE (CASE WHEN _livemode THEN 'cs_live_%' ELSE 'cs_test_%' END)
      AND created_at >= _from AND created_at < _to
  )
  SELECT jsonb_build_object(
    'checkouts_started', (SELECT count(*) FROM c),
    'checkouts_obituary', (SELECT count(*) FROM c WHERE kind = 'obituary'),
    'checkouts_memorial', (SELECT count(*) FROM c WHERE kind = 'memorial'),
    'paid', (SELECT count(*) FROM c WHERE is_paid),
    'gross', (SELECT coalesce(sum(amount_paid) FILTER (WHERE is_paid),0) FROM c)
  ) INTO r;
  RETURN r;
END $function$;

REVOKE ALL ON FUNCTION public.admin_candle_report(timestamptz, timestamptz, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_candle_report(timestamptz, timestamptz, boolean) TO authenticated;
