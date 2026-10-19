-- Cache for the admin "Google i ponašanje" report (filled only by the admin-google-stats edge function).
CREATE TABLE IF NOT EXISTS public.admin_google_stats_cache (
  days int PRIMARY KEY,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_google_stats_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_google_stats_cache FROM anon, authenticated;
GRANT ALL ON public.admin_google_stats_cache TO service_role;

-- Memorial wizard steps (wizard_1 … wizard_7) are recorded as funnel steps, with or without consent
-- (without consent only the anonymous step counter, like the other steps).
DROP POLICY IF EXISTS "Anyone records funnel step" ON public.funnel_events;
CREATE POLICY "Anyone records funnel step" ON public.funnel_events FOR INSERT TO anon, authenticated
WITH CHECK (
  step = ANY (ARRAY['visit_landing','start_create','auth','draft_saved','checkout_started','checkout_returned',
                    'consent_accepted','consent_rejected','consent_custom',
                    'wizard_1','wizard_2','wizard_3','wizard_4','wizard_5','wizard_6','wizard_7'])
  AND (user_id IS NULL OR user_id = auth.uid())
  AND COALESCE(length(visitor_id), 0) <= 64
  AND COALESCE(length(source), 0) <= 200
  AND COALESCE(length(medium), 0) <= 200
  AND COALESCE(length(campaign), 0) <= 200
  AND COALESCE(length(path), 0) <= 500
  AND COALESCE(length(device), 0) <= 20
  AND (consented OR (visitor_id IS NULL AND source IS NULL AND medium IS NULL AND campaign IS NULL))
);

-- Wizard drop-off per step and device for the admin report.
CREATE OR REPLACE FUNCTION public.admin_wizard_steps(_from timestamptz, _to timestamptz)
RETURNS TABLE(step text, device text, n bigint) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Zabranjeno'; END IF;
  RETURN QUERY
    SELECT f.step, coalesce(f.device,'nepoznato'), count(*)
    FROM public.funnel_events f
    WHERE f.created_at >= _from AND f.created_at < _to
      AND f.step IN ('start_create','wizard_1','wizard_2','wizard_3','wizard_4','wizard_5','wizard_6','wizard_7')
    GROUP BY 1, 2
    UNION ALL
    SELECT 'checkout'::text, coalesce(o.device,'nepoznato'), count(*)
    FROM public.memorial_orders o
    WHERE o.created_at >= _from AND o.created_at < _to AND o.livemode
    GROUP BY 1, 2
    UNION ALL
    SELECT 'paid'::text, coalesce(o.device,'nepoznato'), count(*)
    FROM public.memorial_orders o
    WHERE o.created_at >= _from AND o.created_at < _to AND o.livemode
      AND o.status IN ('paid','free','partially_refunded','refunded','disputed')
    GROUP BY 1, 2;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_wizard_steps(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_wizard_steps(timestamptz, timestamptz) TO authenticated;
