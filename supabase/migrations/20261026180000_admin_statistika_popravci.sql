-- Admin statistika fixes (26.10.2026).
-- 1) A crawler that ignores robots.txt opened /kreiraj-memorijal ~13,000 times on 23.-24.10.2026 without consent
--    and filled funnel_events with fake steps. A real visitor sends each step at most once per tab, so more than
--    20 events of one step in one hour without consent is treated as automated traffic and left out of reports.
-- 2) Wizard report counts people (memorial, user or visitor; one row per tab without consent) instead of events,
--    separates Stripe checkouts from free promo activations and starts at the first tracked wizard step.

CREATE OR REPLACE FUNCTION public.funnel_events_clean(_from timestamptz, _to timestamptz)
RETURNS SETOF public.funnel_events LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (x.f).* FROM (
    SELECT f, count(*) FILTER (WHERE NOT f.consented) OVER (PARTITION BY f.step, date_trunc('hour', f.created_at)) AS burst
    FROM public.funnel_events f
    WHERE f.created_at >= _from AND f.created_at < _to
  ) x
  WHERE (x.f).consented OR x.burst <= 20
$$;
REVOKE EXECUTE ON FUNCTION public.funnel_events_clean(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.admin_wizard_steps(timestamptz, timestamptz);
CREATE FUNCTION public.admin_wizard_steps(_from timestamptz, _to timestamptz)
RETURNS TABLE(step text, campaign text, n bigint) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _all bigint;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Zabranjeno'; END IF;
  -- Orders from before the wizard was tracked would show payments without any steps before them.
  _from := greatest(_from, coalesce((SELECT min(f.created_at) FROM public.funnel_events f WHERE f.step = 'start_create'), _from));
  SELECT count(*) INTO _all FROM public.funnel_events f WHERE f.created_at >= _from AND f.created_at < _to;
  RETURN QUERY
    SELECT f.step, f.campaign, count(DISTINCT coalesce(f.memorial_id::text, f.user_id::text, f.visitor_id, f.id::text))
    FROM public.funnel_events_clean(_from, _to) f
    WHERE f.step IN ('start_create','person_search','person_manual','wizard_1','wizard_2','wizard_3','wizard_4','wizard_5','wizard_6','wizard_7',
                     'flow_osoba','flow_email','flow_prica','flow_pregled',
                     'checkout_started','draft_email','draft_email_skipped','draft_resumed')
    GROUP BY 1, 2
    UNION ALL
    SELECT 'checkout'::text, o.checkout_campaign, count(DISTINCT o.memorial_id)
    FROM public.memorial_orders o
    WHERE o.created_at >= _from AND o.created_at < _to AND o.livemode AND NOT o.is_free
    GROUP BY 1, 2
    UNION ALL
    SELECT 'paid'::text, o.checkout_campaign, count(DISTINCT o.memorial_id)
    FROM public.memorial_orders o
    WHERE o.created_at >= _from AND o.created_at < _to AND o.livemode AND NOT o.is_free
      AND o.status IN ('paid','partially_refunded','refunded','disputed')
    GROUP BY 1, 2
    UNION ALL
    SELECT 'free'::text, o.checkout_campaign, count(DISTINCT o.memorial_id)
    FROM public.memorial_orders o
    WHERE o.created_at >= _from AND o.created_at < _to AND o.livemode AND o.is_free
    GROUP BY 1, 2
    UNION ALL
    SELECT '_bot'::text, NULL::text, _all - (SELECT count(*) FROM public.funnel_events_clean(_from, _to))
    UNION ALL
    SELECT '_since'::text, to_char(_from AT TIME ZONE 'Europe/Zagreb', 'YYYY-MM-DD'), 0::bigint;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_wizard_steps(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_wizard_steps(timestamptz, timestamptz) TO authenticated;

-- 3) Sales report funnel: same bot filter, plus a people count per step.
CREATE OR REPLACE FUNCTION public.admin_sales_report(_from timestamp with time zone, _to timestamp with time zone, _livemode boolean DEFAULT true, _promo text DEFAULT NULL::text, _visibility text DEFAULT NULL::text, _source text DEFAULT NULL::text, _bucket text DEFAULT 'day'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Zabranjeno'; END IF;
  IF _bucket NOT IN ('day','week','month') THEN _bucket := 'day'; END IF;

  WITH o AS (
    SELECT o.*, m.visibility, m.status AS memorial_status
    FROM public.memorial_orders o LEFT JOIN public.memorials m ON m.id = o.memorial_id
    WHERE o.created_at >= _from AND o.created_at < _to AND o.livemode = _livemode
      AND (_promo IS NULL OR upper(o.promo_code) = upper(_promo))
      AND (_visibility IS NULL OR m.visibility = _visibility)
      AND (_source IS NULL OR coalesce(o.checkout_source,'Nepoznato') = _source)
  ),
  paidset AS (SELECT * FROM o WHERE status IN ('paid','partially_refunded','refunded','disputed') AND NOT is_free),
  stripe_o AS (SELECT * FROM o WHERE NOT is_free)
  SELECT jsonb_build_object(
    'unique_paying_customers', (SELECT count(DISTINCT coalesce(user_id::text, lower(customer_email))) FROM paidset),
    'paid_orders', (SELECT count(*) FROM paidset),
    'paid_memorials', (SELECT count(DISTINCT memorial_id) FROM paidset),
    'free_activations', (SELECT count(*) FROM o WHERE is_free),
    'checkouts_started', (SELECT count(*) FROM stripe_o),
    'checkouts_open', (SELECT count(*) FROM stripe_o WHERE status IN ('checkout_open','returned_unpaid','processing','requires_action') AND (checkout_expires_at IS NULL OR checkout_expires_at > now())),
    'checkouts_expired', (SELECT count(*) FROM stripe_o WHERE status = 'expired'),
    'checkouts_failed', (SELECT count(*) FROM stripe_o WHERE failed_attempt_count > 0),
    'returned_unpaid', (SELECT count(*) FROM stripe_o WHERE returned_without_payment_at IS NOT NULL),
    'recovered_after_failure', (SELECT count(*) FROM paidset WHERE failed_attempt_count > 0 OR returned_without_payment_at IS NOT NULL),
    'tried_never_bought', (SELECT count(*) FROM (SELECT DISTINCT coalesce(user_id::text, lower(customer_email)) k FROM stripe_o) a
        WHERE a.k NOT IN (SELECT coalesce(user_id::text, lower(customer_email)) FROM public.memorial_orders WHERE status IN ('paid','partially_refunded','refunded','disputed') AND livemode = _livemode AND coalesce(user_id::text, lower(customer_email)) IS NOT NULL)),
    'gross', (SELECT coalesce(sum(amount_paid),0) FROM paidset),
    'refunded', (SELECT coalesce(sum(amount_refunded),0) FROM paidset),
    'fees', (SELECT sum(stripe_fee) FROM paidset),
    'fees_known_count', (SELECT count(*) FROM paidset WHERE stripe_fee IS NOT NULL),
    'discounts', (SELECT coalesce(sum(discount_amount),0) FROM o WHERE status IN ('paid','partially_refunded','refunded','disputed')),
    'avg_order', (SELECT avg(amount_paid) FROM paidset),
    'status_counts', (SELECT coalesce(jsonb_object_agg(status, c),'{}'::jsonb) FROM (SELECT status, count(*) c FROM o GROUP BY status) s),
    'failure_reasons', (SELECT coalesce(jsonb_agg(jsonb_build_object('code', failure_code, 'count', c) ORDER BY c DESC),'[]'::jsonb)
        FROM (SELECT coalesce(e.failure_code,'unknown') failure_code, count(*) c FROM public.payment_events e JOIN o ON o.id = e.order_id WHERE e.event_type = 'payment_failed' GROUP BY 1) f),
    'timeseries', (SELECT coalesce(jsonb_agg(jsonb_build_object('bucket', b, 'orders', n, 'amount', a) ORDER BY b),'[]'::jsonb)
        FROM (SELECT to_char(date_trunc(_bucket, paid_at AT TIME ZONE 'Europe/Zagreb'),'YYYY-MM-DD') b, count(*) n, sum(amount_paid - amount_refunded) a FROM paidset WHERE paid_at IS NOT NULL GROUP BY 1) t),
    'sources', (SELECT coalesce(jsonb_agg(jsonb_build_object('source', s, 'medium', md, 'campaign', cp, 'orders', n, 'amount', a) ORDER BY n DESC),'[]'::jsonb)
        FROM (SELECT coalesce(checkout_source,'Nepoznato') s, coalesce(checkout_medium,'Nepoznato') md, coalesce(checkout_campaign,'Nepoznato') cp, count(*) n, sum(amount_paid) a FROM paidset GROUP BY 1,2,3) x),
    'devices', (SELECT coalesce(jsonb_agg(jsonb_build_object('device', d, 'orders', n, 'amount', a) ORDER BY n DESC),'[]'::jsonb)
        FROM (SELECT coalesce(device,'Nepoznato') d, count(*) n, sum(amount_paid) a FROM paidset GROUP BY 1) x),
    'promo', (SELECT coalesce(jsonb_agg(jsonb_build_object('code', code, 'uses', uses, 'free', free, 'discount', disc, 'paid', paid, 'users', users, 'created_by', cb) ORDER BY uses DESC),'[]'::jsonb)
        FROM (SELECT o.promo_code code,
                count(*) FILTER (WHERE o.status IN ('paid','partially_refunded','refunded','disputed')) uses,
                count(*) FILTER (WHERE o.is_free) free,
                coalesce(sum(o.discount_amount) FILTER (WHERE o.status IN ('paid','partially_refunded','refunded','disputed')),0) disc,
                coalesce(sum(o.amount_paid) FILTER (WHERE NOT o.is_free),0) paid,
                count(DISTINCT o.user_id) users,
                max(coalesce(au.name, au.email)) cb
              FROM o LEFT JOIN public.promo_codes pc ON pc.id = o.promo_code_id LEFT JOIN public.admin_users au ON au.id = pc.created_by_admin_id
              WHERE o.promo_code IS NOT NULL GROUP BY o.promo_code) p),
    'time_to_purchase_hours', (SELECT jsonb_build_object('avg', avg(h), 'median', percentile_cont(0.5) WITHIN GROUP (ORDER BY h), 'n', count(*))
        FROM (SELECT extract(epoch FROM (o.paid_at - m.created_at))/3600 h FROM o JOIN public.memorials m ON m.id = o.memorial_id WHERE o.paid_at IS NOT NULL AND o.status IN ('paid','partially_refunded','refunded','disputed')) t),
    'time_to_publish_hours', (SELECT jsonb_build_object('avg', avg(h), 'median', percentile_cont(0.5) WITHIN GROUP (ORDER BY h), 'n', count(*))
        FROM (SELECT extract(epoch FROM (m.published_at - o.paid_at))/3600 h FROM o JOIN public.memorials m ON m.id = o.memorial_id WHERE o.paid_at IS NOT NULL AND m.published_at IS NOT NULL AND m.published_at >= o.paid_at - interval '1 minute') t),
    'funnel', (SELECT jsonb_build_object(
        'tracking_since', (SELECT min(created_at) FROM public.funnel_events),
        'steps', coalesce((SELECT jsonb_object_agg(step, jsonb_build_object('events', n, 'visitors', v, 'consented', c, 'people', p)) FROM (
            SELECT step, count(*) n, count(DISTINCT coalesce(visitor_id, user_id::text)) v, count(*) FILTER (WHERE consented) c,
              count(DISTINCT coalesce(memorial_id::text, user_id::text, visitor_id, id::text)) p
            FROM public.funnel_events_clean(_from, _to) GROUP BY step) f), '{}'::jsonb),
        'bot_excluded', (SELECT count(*) FROM public.funnel_events WHERE created_at >= _from AND created_at < _to)
                        - (SELECT count(*) FROM public.funnel_events_clean(_from, _to)),
        'checkout_users', (SELECT count(DISTINCT user_id) FROM o),
        'paid_or_free_users', (SELECT count(DISTINCT user_id) FROM o WHERE status IN ('paid','partially_refunded','refunded','disputed') OR is_free),
        'published', (SELECT count(*) FROM public.memorials WHERE published_at >= _from AND published_at < _to)
      ))
  ) INTO r;
  RETURN r;
END $function$;
