ALTER TABLE public.memorials ADD COLUMN IF NOT EXISTS scheduled_publish_at timestamptz;

CREATE OR REPLACE FUNCTION public.publish_scheduled_memorials()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE public.memorials
     SET status = 'published', published_at = now(), scheduled_publish_at = NULL
   WHERE paid AND status = 'draft' AND scheduled_publish_at IS NOT NULL AND scheduled_publish_at <= now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.publish_scheduled_memorials() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('publish-scheduled-memorials', '0 * * * *', $$SELECT public.publish_scheduled_memorials();$$);