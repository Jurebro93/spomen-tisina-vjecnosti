-- Guests (anonymous sessions) can leave an e-mail for their memorial draft, so they get a link back to it
-- and the hourly reminder can reach them. Kept in its own table, not on memorials: published memorials are
-- read publicly with select('*'). No policies: only the service role (edge functions) reads or writes it.
CREATE TABLE IF NOT EXISTS public.memorial_draft_contacts (
  memorial_id uuid PRIMARY KEY REFERENCES public.memorials(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (length(email) <= 320),
  -- Secret in the e-mailed link; lets the draft move to the browser that opens the link.
  resume_token text NOT NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.memorial_draft_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.memorial_draft_contacts FROM anon, authenticated;

-- New funnel steps: a guest left an e-mail for the draft, and a draft was reopened.
DROP POLICY IF EXISTS "Anyone records funnel step" ON public.funnel_events;
CREATE POLICY "Anyone records funnel step" ON public.funnel_events FOR INSERT TO anon, authenticated
WITH CHECK (
  step = ANY (ARRAY['visit_landing','start_create','auth','draft_saved','checkout_started','checkout_returned',
                    'consent_accepted','consent_rejected','consent_custom',
                    'wizard_1','wizard_2','wizard_3','wizard_4','wizard_5','wizard_6','wizard_7',
                    'person_search','person_manual','guest_account',
                    'draft_email','draft_resumed'])
  AND (user_id IS NULL OR user_id = auth.uid())
  AND COALESCE(length(visitor_id), 0) <= 64
  AND COALESCE(length(source), 0) <= 200
  AND COALESCE(length(medium), 0) <= 200
  AND COALESCE(length(campaign), 0) <= 200
  AND COALESCE(length(path), 0) <= 500
  AND COALESCE(length(device), 0) <= 20
  AND (consented OR (visitor_id IS NULL AND source IS NULL AND medium IS NULL AND campaign IS NULL))
);

-- Wizard report: the two draft steps as well.
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
                     'checkout_started','draft_email','draft_resumed')
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
