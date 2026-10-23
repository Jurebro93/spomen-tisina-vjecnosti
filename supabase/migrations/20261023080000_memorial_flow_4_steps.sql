-- Shorter memorial wizard (4 steps, e-mail right after the first one) and a second draft reminder.

-- 1) Second reminder for unfinished drafts, about 3 days after the draft was started.
ALTER TABLE public.memorials ADD COLUMN IF NOT EXISTS draft_reminder2_sent_at timestamptz;

-- 2) Funnel steps of the new wizard (flow_*) and a skipped e-mail step; the old wizard_* steps stay for history.
DROP POLICY IF EXISTS "Anyone records funnel step" ON public.funnel_events;
CREATE POLICY "Anyone records funnel step" ON public.funnel_events FOR INSERT TO anon, authenticated
WITH CHECK (
  step = ANY (ARRAY['visit_landing','start_create','auth','draft_saved','checkout_started','checkout_returned',
                    'consent_accepted','consent_rejected','consent_custom',
                    'wizard_1','wizard_2','wizard_3','wizard_4','wizard_5','wizard_6','wizard_7',
                    'flow_osoba','flow_email','flow_prica','flow_pregled',
                    'person_search','person_manual','guest_account',
                    'draft_email','draft_email_skipped','draft_resumed'])
  AND (user_id IS NULL OR user_id = auth.uid())
  AND COALESCE(length(visitor_id), 0) <= 64
  AND COALESCE(length(source), 0) <= 200
  AND COALESCE(length(medium), 0) <= 200
  AND COALESCE(length(campaign), 0) <= 200
  AND COALESCE(length(path), 0) <= 500
  AND COALESCE(length(device), 0) <= 20
  AND (consented OR (visitor_id IS NULL AND source IS NULL AND medium IS NULL AND campaign IS NULL))
);

DROP FUNCTION IF EXISTS public.admin_wizard_steps(timestamptz, timestamptz);
CREATE FUNCTION public.admin_wizard_steps(_from timestamptz, _to timestamptz)
RETURNS TABLE(step text, device text, campaign text, n bigint) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Zabranjeno'; END IF;
  RETURN QUERY
    SELECT f.step, coalesce(f.device,'nepoznato'), f.campaign, count(*)
    FROM public.funnel_events f
    WHERE f.created_at >= _from AND f.created_at < _to
      AND f.step IN ('start_create','person_search','person_manual','wizard_1','wizard_2','wizard_3','wizard_4','wizard_5','wizard_6','wizard_7',
                     'flow_osoba','flow_email','flow_prica','flow_pregled',
                     'checkout_started','draft_email','draft_email_skipped','draft_resumed')
    GROUP BY 1, 2, 3
    UNION ALL
    SELECT 'checkout'::text, coalesce(o.device,'nepoznato'), o.checkout_campaign, count(*)
    FROM public.memorial_orders o
    WHERE o.created_at >= _from AND o.created_at < _to AND o.livemode
    GROUP BY 1, 2, 3
    UNION ALL
    SELECT 'paid'::text, coalesce(o.device,'nepoznato'), o.checkout_campaign, count(*)
    FROM public.memorial_orders o
    WHERE o.created_at >= _from AND o.created_at < _to AND o.livemode
      AND o.status IN ('paid','free','partially_refunded','refunded','disputed')
    GROUP BY 1, 2, 3;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_wizard_steps(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_wizard_steps(timestamptz, timestamptz) TO authenticated;
