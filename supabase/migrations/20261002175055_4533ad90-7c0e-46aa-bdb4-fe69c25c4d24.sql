CREATE TABLE public.memorial_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid REFERENCES public.memorials(id) ON DELETE SET NULL,
  user_id uuid,
  customer_email text,
  customer_name text,
  status text NOT NULL DEFAULT 'checkout_open',
  original_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  amount_refunded numeric NOT NULL DEFAULT 0,
  stripe_fee numeric,
  currency text NOT NULL DEFAULT 'eur',
  promo_code_id uuid,
  promo_code text,
  livemode boolean NOT NULL DEFAULT true,
  is_free boolean NOT NULL DEFAULT false,
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  attempt_count integer NOT NULL DEFAULT 0,
  failed_attempt_count integer NOT NULL DEFAULT 0,
  last_failure_code text,
  last_failure_message text,
  first_source text, first_medium text, first_campaign text,
  checkout_source text, checkout_medium text, checkout_campaign text,
  device text,
  checkout_expires_at timestamptz,
  returned_without_payment_at timestamptz,
  expired_at timestamptz,
  paid_at timestamptz,
  refunded_at timestamptz,
  disputed_at timestamptz,
  backfilled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX memorial_orders_created_idx ON public.memorial_orders(created_at);
CREATE INDEX memorial_orders_memorial_idx ON public.memorial_orders(memorial_id);
CREATE INDEX memorial_orders_user_idx ON public.memorial_orders(user_id);
CREATE INDEX memorial_orders_pi_idx ON public.memorial_orders(stripe_payment_intent_id);
GRANT SELECT ON public.memorial_orders TO authenticated;
GRANT ALL ON public.memorial_orders TO service_role;
ALTER TABLE public.memorial_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read orders" ON public.memorial_orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_memorial_orders_updated_at BEFORE UPDATE ON public.memorial_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.memorial_orders(id) ON DELETE CASCADE,
  stripe_event_id text UNIQUE,
  event_type text NOT NULL,
  status text,
  amount numeric,
  failure_code text,
  failure_message text,
  livemode boolean,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_events_order_idx ON public.payment_events(order_id, occurred_at);
GRANT SELECT ON public.payment_events TO authenticated;
GRANT ALL ON public.payment_events TO service_role;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read payment events" ON public.payment_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.stripe_webhook_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  livemode boolean,
  processed_ok boolean,
  error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
GRANT SELECT ON public.stripe_webhook_log TO authenticated;
GRANT ALL ON public.stripe_webhook_log TO service_role;
ALTER TABLE public.stripe_webhook_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read webhook log" ON public.stripe_webhook_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id text,
  user_id uuid,
  memorial_id uuid,
  step text NOT NULL,
  consented boolean NOT NULL DEFAULT false,
  source text, medium text, campaign text,
  device text,
  path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX funnel_events_created_idx ON public.funnel_events(created_at, step);
GRANT INSERT ON public.funnel_events TO anon, authenticated;
GRANT SELECT ON public.funnel_events TO authenticated;
GRANT ALL ON public.funnel_events TO service_role;
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone records funnel step" ON public.funnel_events FOR INSERT TO anon, authenticated
  WITH CHECK (
    step IN ('visit_landing','start_create','auth','draft_saved','checkout_started','checkout_returned')
    AND (user_id IS NULL OR user_id = auth.uid())
    AND coalesce(length(visitor_id),0) <= 64 AND coalesce(length(source),0) <= 200
    AND coalesce(length(medium),0) <= 200 AND coalesce(length(campaign),0) <= 200
    AND coalesce(length(path),0) <= 500 AND coalesce(length(device),0) <= 20
    AND (consented OR (visitor_id IS NULL AND source IS NULL AND medium IS NULL AND campaign IS NULL))
  );
CREATE POLICY "Admins read funnel" ON public.funnel_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Owner reports returning from Stripe without a confirmed payment (separate event, never "abandoned").
CREATE OR REPLACE FUNCTION public.mark_checkout_returned(_memorial_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  SELECT o.id INTO v_order FROM public.memorial_orders o
  JOIN public.memorials m ON m.id = o.memorial_id
  WHERE o.memorial_id = _memorial_id AND m.owner_id = auth.uid() AND o.status = 'checkout_open'
  ORDER BY o.created_at DESC LIMIT 1;
  IF v_order IS NULL THEN RETURN; END IF;
  UPDATE public.memorial_orders SET status = 'returned_unpaid', returned_without_payment_at = now() WHERE id = v_order;
  INSERT INTO public.payment_events(order_id, event_type, status) VALUES (v_order, 'checkout_returned', 'returned_unpaid');
END $$;
GRANT EXECUTE ON FUNCTION public.mark_checkout_returned(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_sales_report(_from timestamptz, _to timestamptz, _livemode boolean DEFAULT true, _promo text DEFAULT NULL, _visibility text DEFAULT NULL, _source text DEFAULT NULL, _bucket text DEFAULT 'day')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
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
        'steps', coalesce((SELECT jsonb_object_agg(step, jsonb_build_object('events', n, 'visitors', v, 'consented', c)) FROM (
            SELECT step, count(*) n, count(DISTINCT coalesce(visitor_id, user_id::text)) v, count(*) FILTER (WHERE consented) c
            FROM public.funnel_events WHERE created_at >= _from AND created_at < _to GROUP BY step) f), '{}'::jsonb),
        'checkout_users', (SELECT count(DISTINCT user_id) FROM o),
        'paid_or_free_users', (SELECT count(DISTINCT user_id) FROM o WHERE status IN ('paid','partially_refunded','refunded','disputed') OR is_free),
        'published', (SELECT count(*) FROM public.memorials WHERE published_at >= _from AND published_at < _to)
      ))
  ) INTO r;
  RETURN r;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_sales_report(timestamptz, timestamptz, boolean, text, text, text, text) TO authenticated;

-- Current-state memorial & user stats + operational alerts.
CREATE OR REPLACE FUNCTION public.admin_sales_state()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Zabranjeno'; END IF;
  SELECT jsonb_build_object(
    'memorials_total', (SELECT count(*) FROM memorials),
    'by_status', (SELECT coalesce(jsonb_object_agg(status, c),'{}'::jsonb) FROM (SELECT status, count(*) c FROM memorials GROUP BY 1) s),
    'by_visibility', (SELECT coalesce(jsonb_object_agg(visibility, c),'{}'::jsonb) FROM (SELECT visibility, count(*) c FROM memorials GROUP BY 1) s),
    'paid_stripe', (SELECT count(*) FROM memorials WHERE paid AND coalesce(payment_method,'') = 'stripe'),
    'paid_free', (SELECT count(*) FROM memorials WHERE paid AND payment_method = 'promo_code'),
    'paid_other', (SELECT count(*) FROM memorials WHERE paid AND coalesce(payment_method,'') NOT IN ('stripe','promo_code')),
    'paid_not_published', (SELECT count(*) FROM memorials WHERE paid AND status <> 'published'),
    'registered_users', (SELECT count(*) FROM profiles),
    'users_with_memorial', (SELECT count(DISTINCT owner_id) FROM memorials),
    'users_multi_memorial', (SELECT count(*) FROM (SELECT owner_id FROM memorials GROUP BY 1 HAVING count(*) > 1) x),
    'repeat_buyers', (SELECT count(*) FROM (SELECT user_id FROM memorial_orders WHERE livemode AND NOT is_free AND status IN ('paid','partially_refunded','refunded','disputed') GROUP BY 1 HAVING count(*) > 1) x),
    'alerts', jsonb_build_object(
      'paid_order_memorial_unpaid', (SELECT coalesce(jsonb_agg(jsonb_build_object('order_id', o.id, 'memorial_id', o.memorial_id, 'email', o.customer_email)),'[]'::jsonb)
         FROM memorial_orders o JOIN memorials m ON m.id = o.memorial_id WHERE o.status IN ('paid','partially_refunded') AND NOT m.paid),
      'paid_not_published', (SELECT coalesce(jsonb_agg(jsonb_build_object('memorial_id', id, 'slug', slug, 'status', status, 'paid_at', paid_at)),'[]'::jsonb)
         FROM memorials WHERE paid AND status <> 'published'),
      'double_paid', (SELECT coalesce(jsonb_agg(jsonb_build_object('memorial_id', memorial_id, 'count', c)),'[]'::jsonb)
         FROM (SELECT memorial_id, count(*) c FROM memorial_orders WHERE status IN ('paid','partially_refunded','disputed') AND NOT is_free AND memorial_id IS NOT NULL GROUP BY 1 HAVING count(*) > 1) d),
      'long_processing', (SELECT coalesce(jsonb_agg(jsonb_build_object('order_id', id, 'email', customer_email, 'since', updated_at)),'[]'::jsonb)
         FROM memorial_orders WHERE status IN ('processing','requires_action') AND updated_at < now() - interval '24 hours'),
      'webhook_failures', (SELECT coalesce(jsonb_agg(jsonb_build_object('event_id', stripe_event_id, 'type', event_type, 'error', error, 'at', received_at) ORDER BY received_at DESC),'[]'::jsonb)
         FROM (SELECT * FROM stripe_webhook_log WHERE processed_ok IS NOT TRUE AND received_at > now() - interval '30 days' ORDER BY received_at DESC LIMIT 50) w),
      'refund_mismatch', (SELECT coalesce(jsonb_agg(jsonb_build_object('order_id', o.id, 'email', o.customer_email)),'[]'::jsonb)
         FROM memorial_orders o LEFT JOIN invoices i ON i.stripe_checkout_session_id = o.stripe_checkout_session_id
         WHERE (o.amount_refunded > 0 AND coalesce(i.invoice_status,'') <> 'refunded') OR (o.amount_refunded = 0 AND i.invoice_status = 'refunded')),
      'stripe_db_mismatch', (SELECT coalesce(jsonb_agg(jsonb_build_object('memorial_id', m.id, 'slug', m.slug)),'[]'::jsonb)
         FROM memorials m WHERE m.paid AND m.payment_method = 'stripe' AND NOT EXISTS (SELECT 1 FROM memorial_orders o WHERE o.memorial_id = m.id AND o.status IN ('paid','partially_refunded','refunded','disputed')))
    ),
    'refreshed_at', now()
  ) INTO r;
  RETURN r;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_sales_state() TO authenticated;