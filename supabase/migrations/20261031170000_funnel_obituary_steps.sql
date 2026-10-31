-- Memorial pre-filled from an obituary: count the path from the obituary page to the draft.
--   obit_cta            click on a memorial button on an obituary page
--   obit_preview        the pre-filled memorial preview was shown (/kreiraj-memorijal?deceased_id=...)
--   obit_email          e-mail left on that first screen
--   obit_email_skipped  continued from that screen without an e-mail
DROP POLICY IF EXISTS "Anyone records funnel step" ON public.funnel_events;
CREATE POLICY "Anyone records funnel step" ON public.funnel_events FOR INSERT TO anon, authenticated
WITH CHECK (
  step = ANY (ARRAY['visit_landing','start_create','auth','draft_saved','checkout_started','checkout_returned',
                    'consent_accepted','consent_rejected','consent_custom',
                    'wizard_1','wizard_2','wizard_3','wizard_4','wizard_5','wizard_6','wizard_7',
                    'flow_osoba','flow_email','flow_prica','flow_pregled',
                    'person_search','person_manual','guest_account',
                    'draft_email','draft_email_skipped','draft_resumed',
                    'campaign_visit','start_example','start_relation','start_link',
                    'candle_checkout','candle_paid',
                    'obit_cta','obit_preview','obit_email','obit_email_skipped'])
  AND (user_id IS NULL OR user_id = auth.uid())
  AND COALESCE(length(visitor_id), 0) <= 64
  AND COALESCE(length(source), 0) <= 200
  AND COALESCE(length(medium), 0) <= 200
  AND COALESCE(length(campaign), 0) <= 200
  AND COALESCE(length(path), 0) <= 500
  AND COALESCE(length(device), 0) <= 20
  AND (consented OR visitor_id IS NULL)
);

CREATE OR REPLACE FUNCTION public.admin_wizard_steps(_from timestamp with time zone, _to timestamp with time zone)
 RETURNS TABLE(step text, campaign text, n bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
                     'checkout_started','draft_email','draft_email_skipped','draft_resumed',
                     'obit_cta','obit_preview','obit_email','obit_email_skipped')
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
END $function$;
