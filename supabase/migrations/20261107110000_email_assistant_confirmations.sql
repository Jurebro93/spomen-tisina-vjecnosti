-- Changes asked for by e-mail wait here until the item's creator clicks "Potvrdi izmjenu" in the mail sent to
-- the address that created the item (Totohost adds no sender authentication, so the From address alone proves
-- nothing). Read and written only by the edge functions (service role).
CREATE TABLE IF NOT EXISTS public.email_assistant_pending_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  owner_email text NOT NULL,
  item_type text NOT NULL,
  item_id uuid NOT NULL,
  item_summary text,
  changes jsonb NOT NULL,
  before jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired', 'failed')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '72 hours',
  confirmed_at timestamptz
);

ALTER TABLE public.email_assistant_pending_changes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_assistant_pending_changes' AND policyname = 'Admins read email assistant pending changes') THEN
    CREATE POLICY "Admins read email assistant pending changes" ON public.email_assistant_pending_changes
      FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
