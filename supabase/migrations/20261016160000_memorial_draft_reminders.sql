-- lovable-cron-fallback-reviewed: Stripe never sends checkout.session.expired here (payment_events has no checkout_expired rows), so stale checkouts are closed by time; draft reminders go out once per memorial, 24 h after the draft was created.

-- 1) Close checkouts whose Stripe session has already expired.
CREATE OR REPLACE FUNCTION public.expire_stale_memorial_checkouts()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH done AS (
    UPDATE public.memorial_orders
    SET status = 'expired', expired_at = coalesce(expired_at, checkout_expires_at), updated_at = now()
    WHERE status = 'checkout_open' AND checkout_expires_at < now()
    RETURNING 1
  )
  SELECT count(*)::integer FROM done
$$;

REVOKE ALL ON FUNCTION public.expire_stale_memorial_checkouts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_memorial_checkouts() TO service_role;

-- 2) One reminder per unfinished draft.
ALTER TABLE public.memorials ADD COLUMN IF NOT EXISTS draft_reminder_sent_at timestamptz;

-- 3) Secret for the scheduled reminder function, readable only by the server.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS supabase_vault;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.memorial_reminder_secret()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'MEMORIAL_REMINDER_SECRET' LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.memorial_reminder_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.memorial_reminder_secret() TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'MEMORIAL_REMINDER_SECRET') THEN
    PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'MEMORIAL_REMINDER_SECRET', 'Authorization secret for scheduled memorial-draft-reminder edge function');
  END IF;
END $$;

-- 4) Hourly jobs: close stale checkouts, then send due reminders.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-stale-memorial-checkouts') THEN
    PERFORM cron.unschedule('expire-stale-memorial-checkouts');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'memorial-draft-reminder') THEN
    PERFORM cron.unschedule('memorial-draft-reminder');
  END IF;
END $$;

SELECT cron.schedule('expire-stale-memorial-checkouts', '5 * * * *', 'SELECT public.expire_stale_memorial_checkouts();');

SELECT cron.schedule('memorial-draft-reminder', '15 * * * *', $cron$
  SELECT net.http_post(
    url := 'https://umpvnepxsqfkxjpclkxc.supabase.co/functions/v1/memorial-draft-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-reminder-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'MEMORIAL_REMINDER_SECRET')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  );
$cron$);
