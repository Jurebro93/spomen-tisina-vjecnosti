CREATE TABLE public.discount_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  source text NOT NULL DEFAULT 'popup',
  promo_code_id uuid REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  promo_code text,
  newsletter_opt_in boolean NOT NULL DEFAULT false,
  email_sent_at timestamptz,
  email_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.discount_signups TO authenticated;
GRANT ALL ON public.discount_signups TO service_role;
ALTER TABLE public.discount_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read discount signups" ON public.discount_signups FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));