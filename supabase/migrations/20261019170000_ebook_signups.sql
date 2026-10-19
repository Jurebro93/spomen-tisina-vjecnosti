-- E-mail signups for the free guide "Kad izgubite voljenu osobu" (homepage, obituary pages,
-- /besplatni-vodic). Written only by the claim-ebook edge function (service role).
CREATE TABLE public.ebook_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  placement text NOT NULL DEFAULT 'unknown',
  landing_url text,
  promo_code text,
  downloads integer NOT NULL DEFAULT 1,
  email_sent_at timestamptz,
  email_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_requested_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ebook_signups TO authenticated;
GRANT ALL ON public.ebook_signups TO service_role;
ALTER TABLE public.ebook_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read ebook signups" ON public.ebook_signups FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
