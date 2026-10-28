-- Paid candles: 7 days 3,99 €, 14 days 5,99 €, 30 days 9,99 € (Stripe Checkout).
-- Candles are created unpaid by the create-candle-payment edge function and only become
-- visible once Stripe confirms the payment (verify-candle-payment / stripe-webhook).

-- Obituary candles
ALTER TABLE public.virtual_candles
  ADD COLUMN IF NOT EXISTS duration_days integer,
  ADD COLUMN IF NOT EXISTS amount_paid numeric(10,2),
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_relight_session_id text;

-- Memorial candles: unpaid rows keep status 'pending' with payment_status 'unpaid'
-- so they never reach the public (approved only) or the moderation list.
ALTER TABLE public.memorial_candles
  ADD COLUMN IF NOT EXISTS visitor_email text,
  ADD COLUMN IF NOT EXISTS duration_days integer,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_status text,
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS amount_paid numeric(10,2),
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE INDEX IF NOT EXISTS memorial_candles_stripe_session_idx ON public.memorial_candles (stripe_session_id);
CREATE INDEX IF NOT EXISTS virtual_candles_stripe_session_idx ON public.virtual_candles (stripe_payment_intent_id);

-- Visitors can no longer insert memorial candles directly: lighting one goes through payment.
ALTER POLICY "Anyone can light candle" ON public.memorial_candles WITH CHECK (false);

-- Visitor e-mail is never readable by the public (column-level grant keeps the old public columns).
REVOKE SELECT ON public.memorial_candles FROM anon, authenticated;
GRANT SELECT (id, memorial_id, visitor_name, message, status, created_at, approved_at, approved_by, expires_at, duration_days, payment_status)
  ON public.memorial_candles TO anon, authenticated;
