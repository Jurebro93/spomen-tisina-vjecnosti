-- Create storage bucket for sitemaps
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sitemaps', 'sitemaps', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for sitemap bucket
CREATE POLICY "Public sitemap access" ON storage.objects
FOR SELECT USING (bucket_id = 'sitemaps');

CREATE POLICY "Service role can manage sitemaps" ON storage.objects
FOR ALL USING (bucket_id = 'sitemaps');

-- Schedule sitemap generation every 8 hours
SELECT cron.schedule(
  'generate-sitemap-every-8h',
  '0 */8 * * *', -- Every 8 hours at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://umpvnepxsqfkxjpclkxc.supabase.co/functions/v1/generate-sitemap',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtcHZuZXB4c3Fma3hqcGNsa3hjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY3MzIwMCwiZXhwIjoyMDY4MjQ5MjAwfQ.PJnqZIGQVFgHUdQF8Fo4XGOSZJLfaQv9mYjOFvwVNjE"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);