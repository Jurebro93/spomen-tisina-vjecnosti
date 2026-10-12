ALTER TABLE public.blogs
  ADD COLUMN IF NOT EXISTS sales_heading text,
  ADD COLUMN IF NOT EXISTS sales_text text,
  ADD COLUMN IF NOT EXISTS cta_text text,
  ADD COLUMN IF NOT EXISTS cta_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS interactive_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS interactive_items text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.memorial_orders
  ADD COLUMN IF NOT EXISTS blog_slug text,
  ADD COLUMN IF NOT EXISTS blog_cta text,
  ADD COLUMN IF NOT EXISTS blog_touched_at timestamptz;

CREATE TABLE public.blog_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_slug text NOT NULL,
  event text NOT NULL,
  cta_id text,
  visitor_id text,
  device text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX blog_events_slug_time ON public.blog_events (blog_slug, created_at);
CREATE INDEX blog_events_time ON public.blog_events (created_at);
CREATE INDEX memorial_orders_blog ON public.memorial_orders (blog_slug) WHERE blog_slug IS NOT NULL;
GRANT INSERT ON public.blog_events TO anon, authenticated;
GRANT SELECT ON public.blog_events TO authenticated;
GRANT ALL ON public.blog_events TO service_role;
ALTER TABLE public.blog_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone logs valid blog events" ON public.blog_events FOR INSERT TO anon, authenticated
  WITH CHECK (event IN ('view','cta_click','link_click','interactive','start_create')
    AND length(blog_slug) BETWEEN 1 AND 200 AND (cta_id IS NULL OR length(cta_id) <= 80)
    AND (visitor_id IS NULL OR length(visitor_id) <= 64));
CREATE POLICY "Admins read blog events" ON public.blog_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_blog_report(_from timestamptz, _to timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  WITH ev AS (
    SELECT * FROM blog_events WHERE created_at >= _from AND created_at < _to
  ), ord AS (
    SELECT o.*, COALESCE(o.paid_at, o.created_at) AS at,
      (o.status IN ('paid','partially_refunded','refunded','disputed') AND NOT o.is_free) AS is_paid,
      GREATEST(COALESCE(o.amount_paid,0) - COALESCE(o.amount_refunded,0), 0) AS net
    FROM memorial_orders o
    WHERE o.blog_slug IS NOT NULL AND COALESCE(o.paid_at, o.created_at) >= _from AND COALESCE(o.paid_at, o.created_at) < _to
  ), per_blog AS (
    SELECT s.slug,
      (SELECT title FROM blogs b WHERE b.slug = s.slug LIMIT 1) AS title,
      (SELECT count(*) FROM ev WHERE ev.blog_slug = s.slug AND event='view') AS views,
      (SELECT count(*) FROM ev WHERE ev.blog_slug = s.slug AND event IN ('cta_click','link_click')) AS cta_clicks,
      (SELECT count(*) FROM ev WHERE ev.blog_slug = s.slug AND event='interactive') AS interactions,
      (SELECT count(*) FROM ev WHERE ev.blog_slug = s.slug AND event='start_create') AS starts,
      (SELECT count(*) FROM ord WHERE ord.blog_slug = s.slug AND status NOT IN ('draft')) AS checkouts,
      (SELECT count(*) FROM ord WHERE ord.blog_slug = s.slug AND is_paid) AS purchases,
      (SELECT count(*) FROM ord WHERE ord.blog_slug = s.slug AND is_free AND status='free') AS free_activations,
      (SELECT COALESCE(sum(net),0) FROM ord WHERE ord.blog_slug = s.slug AND is_paid) AS revenue,
      (SELECT COALESCE(sum(amount_refunded),0) FROM ord WHERE ord.blog_slug = s.slug) AS refunded
    FROM (SELECT DISTINCT blog_slug AS slug FROM ev UNION SELECT DISTINCT blog_slug FROM ord) s
  ), cta AS (
    SELECT blog_slug, COALESCE(cta_id,'—') AS cta_id, event, count(*) AS n FROM ev
    WHERE event IN ('cta_click','link_click','interactive') GROUP BY 1,2,3
  ), cta_orders AS (
    SELECT blog_slug, COALESCE(blog_cta,'—') AS cta_id, count(*) FILTER (WHERE is_paid) AS purchases, COALESCE(sum(net) FILTER (WHERE is_paid),0) AS revenue
    FROM ord GROUP BY 1,2
  ), daily AS (
    SELECT d::date AS day,
      (SELECT count(*) FROM ev WHERE event='view' AND (created_at AT TIME ZONE 'Europe/Zagreb')::date = d::date) AS views,
      (SELECT count(*) FROM ev WHERE event IN ('cta_click','link_click') AND (created_at AT TIME ZONE 'Europe/Zagreb')::date = d::date) AS cta_clicks,
      (SELECT count(*) FROM ord WHERE is_paid AND (at AT TIME ZONE 'Europe/Zagreb')::date = d::date) AS purchases,
      (SELECT COALESCE(sum(net),0) FROM ord WHERE is_paid AND (at AT TIME ZONE 'Europe/Zagreb')::date = d::date) AS revenue
    FROM generate_series((_from AT TIME ZONE 'Europe/Zagreb')::date, ((_to - interval '1 second') AT TIME ZONE 'Europe/Zagreb')::date, interval '1 day') d
  )
  SELECT jsonb_build_object(
    'tracking_since', (SELECT min(created_at) FROM blog_events),
    'totals', jsonb_build_object(
      'views', (SELECT count(*) FROM ev WHERE event='view'),
      'cta_clicks', (SELECT count(*) FROM ev WHERE event IN ('cta_click','link_click')),
      'interactions', (SELECT count(*) FROM ev WHERE event='interactive'),
      'starts', (SELECT count(*) FROM ev WHERE event='start_create'),
      'checkouts', (SELECT count(*) FROM ord WHERE status NOT IN ('draft')),
      'purchases', (SELECT count(*) FROM ord WHERE is_paid),
      'free_activations', (SELECT count(*) FROM ord WHERE is_free AND status='free'),
      'revenue', (SELECT COALESCE(sum(net),0) FROM ord WHERE is_paid),
      'refunded', (SELECT COALESCE(sum(amount_refunded),0) FROM ord),
      'unique_viewers', (SELECT count(DISTINCT visitor_id) FROM ev WHERE event='view' AND visitor_id IS NOT NULL),
      'unique_clickers', (SELECT count(DISTINCT visitor_id) FROM ev WHERE event IN ('cta_click','link_click') AND visitor_id IS NOT NULL),
      'unique_starters', (SELECT count(DISTINCT visitor_id) FROM ev WHERE event='start_create' AND visitor_id IS NOT NULL)
    ),
    'blogs', COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.revenue DESC, p.views DESC) FROM per_blog p), '[]'),
    'ctas', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM cta c), '[]'),
    'cta_orders', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM cta_orders c), '[]'),
    'daily', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.day) FROM daily x), '[]'),
    'orders', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'blog_slug', blog_slug, 'blog_cta', blog_cta, 'status', status, 'is_free', is_free, 'amount_paid', amount_paid, 'amount_refunded', amount_refunded, 'at', at, 'customer_email', customer_email) ORDER BY at DESC) FROM ord), '[]')
  ) INTO result;
  RETURN result;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_blog_report(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_blog_report(timestamptz, timestamptz) TO authenticated;

CREATE POLICY "Admins update blogs sales fields" ON public.blogs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
GRANT UPDATE ON public.blogs TO authenticated;