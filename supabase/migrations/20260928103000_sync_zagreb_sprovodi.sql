-- Funeral schedules scraped from Gradska groblja Zagreb have no birth date or contact.
ALTER TABLE public.sprovodi
  ALTER COLUMN datum_rodenja DROP NOT NULL;

ALTER TABLE public.sprovodi
  ADD COLUMN IF NOT EXISTS izvor text,
  ADD COLUMN IF NOT EXISTS source_key text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sprovodi_source_key_key'
  ) THEN
    ALTER TABLE public.sprovodi
      ADD CONSTRAINT sprovodi_source_key_key UNIQUE (source_key);
  END IF;
END $$;

DROP POLICY IF EXISTS "Public can read Zagreb funeral schedule" ON public.sprovodi;
CREATE POLICY "Public can read Zagreb funeral schedule"
ON public.sprovodi
FOR SELECT
TO anon, authenticated
USING (izvor = 'gradska-groblja-zagreb');

GRANT SELECT ON public.sprovodi TO anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('sync-zagreb-sprovodi');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 06:30 UTC is 08:30 in summer, 07:30 UTC is 08:30 in winter. Only the 08:30 Europe/Zagreb run calls the function.
SELECT cron.schedule(
  'sync-zagreb-sprovodi',
  '30 6,7 * * *',
  $$
  SELECT CASE
    WHEN EXTRACT(HOUR FROM (now() AT TIME ZONE 'Europe/Zagreb')) = 8 THEN net.http_post(
      url := 'https://umpvnepxsqfkxjpclkxc.supabase.co/functions/v1/sync-zagreb-sprovodi',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtcHZuZXB4c3Fma3hqcGNsa3hjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY3MzIwMCwiZXhwIjoyMDY4MjQ5MjAwfQ.PJnqZIGQVFgHUdQF8Fo4XGOSZJLfaQv9mYjOFvwVNjE"}'::jsonb,
      body := '{"scheduled": true}'::jsonb
    )
    ELSE NULL
  END;
  $$
);
