-- Enable pg_cron extension for automated cleanup
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule automatic cleanup of old memorial quotes to run daily at 2 AM
SELECT cron.schedule(
  'cleanup-old-memorial-quotes',
  '0 2 * * *', -- daily at 2 AM
  $$
  DELETE FROM public.memorijalni_citati 
  WHERE approved_at < (NOW() - INTERVAL '365 days')
  AND status = 'approved';
  $$
);