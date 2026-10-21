-- The Zagreb funeral sync job sent a hardcoded bearer token that no longer
-- matches the service role key, so every run returned 401. Send the vault
-- secret instead, like the sync-gradovi-sprovodi job.
SELECT cron.unschedule('sync-zagreb-sprovodi');

SELECT cron.schedule(
  'sync-zagreb-sprovodi',
  '30 6,7 * * *',
  $$
  SELECT CASE
    WHEN EXTRACT(HOUR FROM (now() AT TIME ZONE 'Europe/Zagreb')) = 8 THEN net.http_post(
      url := 'https://umpvnepxsqfkxjpclkxc.supabase.co/functions/v1/sync-zagreb-sprovodi',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-sync-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SPROVODI_SYNC_SECRET')
      ),
      body := '{"scheduled": true}'::jsonb,
      timeout_milliseconds := 60000
    )
    ELSE NULL
  END;
  $$
);
