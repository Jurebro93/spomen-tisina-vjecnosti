-- Funeral schedules for Karlovac, Koprivnica, Dubrovnik and Rijeka, scraped by
-- the sync-gradovi-sprovodi edge function. These sources give no date of death.
ALTER TABLE public.sprovodi
  ALTER COLUMN datum_smrti DROP NOT NULL;

-- Every scraped source is public; rows typed in by hand (izvor IS NULL) stay private.
DROP POLICY IF EXISTS "Public can read Zagreb funeral schedule" ON public.sprovodi;
DROP POLICY IF EXISTS "Public can read scraped funeral schedules" ON public.sprovodi;
CREATE POLICY "Public can read scraped funeral schedules"
ON public.sprovodi
FOR SELECT
TO anon, authenticated
USING (izvor IS NOT NULL);

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS supabase_vault;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.sprovodi_sync_secret()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SPROVODI_SYNC_SECRET' LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.sprovodi_sync_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sprovodi_sync_secret() TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'SPROVODI_SYNC_SECRET') THEN
    PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'SPROVODI_SYNC_SECRET', 'Authorization secret for scheduled sync-gradovi-sprovodi edge function');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-gradovi-sprovodi') THEN
    PERFORM cron.unschedule('sync-gradovi-sprovodi');
  END IF;
END $$;

-- 05:45 and 15:45 UTC: before the morning and after the afternoon updates of the sources.
SELECT cron.schedule('sync-gradovi-sprovodi', '45 5,15 * * *', $cron$
  SELECT net.http_post(
    url := 'https://umpvnepxsqfkxjpclkxc.supabase.co/functions/v1/sync-gradovi-sprovodi',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SPROVODI_SYNC_SECRET')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$cron$);
