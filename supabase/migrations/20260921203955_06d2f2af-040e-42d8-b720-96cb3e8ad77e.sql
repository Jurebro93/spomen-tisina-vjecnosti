CREATE OR REPLACE FUNCTION public.virtual_candle_counts()
RETURNS TABLE(today bigint, this_week bigint, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    count(*) FILTER (
      WHERE (created_at AT TIME ZONE 'Europe/Zagreb')::date
            = (now() AT TIME ZONE 'Europe/Zagreb')::date
    ) AS today,
    count(*) FILTER (
      WHERE (created_at AT TIME ZONE 'Europe/Zagreb')::date
            >= ((now() AT TIME ZONE 'Europe/Zagreb')::date - interval '6 days')
    ) AS this_week,
    count(*) AS total
  FROM public.virtual_candles
  WHERE paid IS TRUE;
$$;