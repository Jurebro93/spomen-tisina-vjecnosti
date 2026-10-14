-- lovable-cron-fallback-reviewed: Meta CAPI Purchase retries must re-send within Meta's delivery window even when the originating request (webhook/checkout) never completes; deliveries have their own attempt limit (max 6) and stale-lock expiry, so the job only acts on rows still awaiting retry.

-- 1) Ekstenzije za tajnu, tajni trezor, cron i HTTP pozive
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS supabase_vault;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2) Zaštita čitanja tajne: samo poslužitelj (service_role) smije pozvati ovu funkciju.
CREATE OR REPLACE FUNCTION public.meta_capi_retry_secret()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE name = 'META_CAPI_RETRY_SECRET'
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.meta_capi_retry_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.meta_capi_retry_secret() TO service_role;

-- 3) Stvori tajnu u Vaultu ako još ne postoji (vrijednost se generira u bazi, nigdje se ne upisuje u kod).
DO $$
DECLARE
  new_secret text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'META_CAPI_RETRY_SECRET') THEN
    new_secret := encode(extensions.gen_random_bytes(32), 'hex');
    PERFORM vault.create_secret(new_secret, 'META_CAPI_RETRY_SECRET', 'Authorization secret for scheduled meta-capi-retry edge function');
  END IF;
END $$;

-- 4) Sigurno ukloni stari posao ako postoji, pa ga zakazuj ponovno (svakih 5 minuta).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'meta-capi-retry') THEN
    PERFORM cron.unschedule('meta-capi-retry');
  END IF;
END $$;

SELECT cron.schedule(
  'meta-capi-retry',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://umpvnepxsqfkxjpclkxc.supabase.co/functions/v1/meta-capi-retry',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-retry-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'META_CAPI_RETRY_SECRET')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  );
  $$
);