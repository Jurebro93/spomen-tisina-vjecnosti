-- Turns ON the follow-up e-mails after a guide signup (edge function guide-email-sequence).
-- Run only after the owner's written approval. Undo: SELECT cron.unschedule('guide-email-sequence');
--                                                   ALTER TABLE public.ebook_signups ALTER COLUMN sequence_started_at DROP DEFAULT;

-- 1) Every new signup from now on takes part.
ALTER TABLE public.ebook_signups ALTER COLUMN sequence_started_at SET DEFAULT now();

-- 2) OPTIONAL: existing signups join too, counted from today (mail 1 in two days).
--    Leave this out to mail only people who sign up after today.
-- UPDATE public.ebook_signups SET sequence_started_at = now() WHERE sequence_started_at IS NULL AND placement <> 'test';

-- 3) Daily run at 09:00 Zagreb time (07:00 UTC in summer, 08:00 UTC in winter; only the 09:00 local run calls).
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'guide-email-sequence') THEN
    PERFORM cron.unschedule('guide-email-sequence');
  END IF;
END $$;
SELECT cron.schedule('guide-email-sequence', '0 7,8 * * *', $cron$
  SELECT CASE WHEN EXTRACT(HOUR FROM (now() AT TIME ZONE 'Europe/Zagreb')) = 9 THEN net.http_post(
    url := 'https://umpvnepxsqfkxjpclkxc.supabase.co/functions/v1/guide-email-sequence',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sequence-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'GUIDE_SEQUENCE_SECRET')
    ),
    body := '{"mode":"run"}'::jsonb,
    timeout_milliseconds := 60000
  ) END;
$cron$);
