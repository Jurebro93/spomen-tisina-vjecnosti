-- Paid candles in the funnel: checkout opened and payment confirmed (with the campaign the visitor came from).
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
                    'candle_checkout','candle_paid'])
  AND (user_id IS NULL OR user_id = auth.uid())
  AND COALESCE(length(visitor_id), 0) <= 64
  AND COALESCE(length(source), 0) <= 200
  AND COALESCE(length(medium), 0) <= 200
  AND COALESCE(length(campaign), 0) <= 200
  AND COALESCE(length(path), 0) <= 500
  AND COALESCE(length(device), 0) <= 20
  AND (consented OR visitor_id IS NULL)
);
