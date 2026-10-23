-- Submit new obituaries to IndexNow every hour (supabase/functions/indexnow-ping).
-- The function only reads public obituaries and needs no auth (verify_jwt = false).
SELECT cron.schedule(
  'indexnow-ping',
  '5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://umpvnepxsqfkxjpclkxc.supabase.co/functions/v1/indexnow-ping',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := '{"minutes": 70}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
