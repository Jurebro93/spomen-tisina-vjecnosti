CREATE TABLE public.business_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  legal_name text NOT NULL,
  address text NOT NULL,
  postal_code text,
  city text,
  country text NOT NULL DEFAULT 'Hrvatska',
  oib text NOT NULL,
  mbo text,
  founded_year text,
  email text NOT NULL,
  phone text,
  website text NOT NULL,
  tax_note text NOT NULL,
  register_info text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_settings TO anon, authenticated;
GRANT UPDATE ON public.business_settings TO authenticated;
GRANT ALL ON public.business_settings TO service_role;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business settings are public" ON public.business_settings FOR SELECT USING (true);
CREATE POLICY "Admins update business settings" ON public.business_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_business_settings_updated_at BEFORE UPDATE ON public.business_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.business_settings (legal_name,address,city,oib,mbo,founded_year,email,website,tax_note)
VALUES ('TECHNIKO, obrt za propagandu i usluge, vl. Nikola Kljajić','Put Drage 25','Žaborić','05906580483','98667360','2023','info@osmrtnica.com.hr','https://osmrtnica.com.hr','Obrt nije u sustavu PDV-a.');

CREATE TABLE public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  version text NOT NULL,
  effective_date date NOT NULL,
  content_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug, version)
);
GRANT SELECT ON public.legal_documents TO anon, authenticated;
GRANT ALL ON public.legal_documents TO service_role;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Legal document versions are public" ON public.legal_documents FOR SELECT USING (true);

CREATE TABLE public.legal_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL UNIQUE,
  case_type text NOT NULL,
  status text NOT NULL DEFAULT 'received',
  user_id uuid,
  full_name text,
  email text,
  order_reference text,
  order_id uuid REFERENCES public.memorial_orders(id),
  memorial_id uuid REFERENCES public.memorials(id),
  contract_date date,
  content_url text,
  problem_type text,
  description text,
  attachment_paths text[] NOT NULL DEFAULT '{}',
  good_faith boolean NOT NULL DEFAULT false,
  within_14_days boolean,
  identity_verified_at timestamptz,
  refund_id text,
  refunded_at timestamptz,
  hidden_at timestamptz,
  deletion_scheduled_at timestamptz,
  deleted_at timestamptz,
  admin_note text,
  response_due_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.legal_cases TO authenticated;
GRANT ALL ON public.legal_cases TO service_role;
ALTER TABLE public.legal_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read cases" ON public.legal_cases FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update cases" ON public.legal_cases FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_legal_cases_updated_at BEFORE UPDATE ON public.legal_cases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.memorial_orders
  ADD COLUMN terms_version text,
  ADD COLUMN terms_accepted_at timestamptz,
  ADD COLUMN immediate_start_requested boolean,
  ADD COLUMN service_start_at timestamptz;

CREATE OR REPLACE FUNCTION public.my_withdrawable_orders()
RETURNS TABLE(order_id uuid, memorial_slug text, paid_at timestamptz, amount_paid numeric, is_free boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, m.slug, o.paid_at, o.amount_paid, o.is_free
  FROM public.memorial_orders o LEFT JOIN public.memorials m ON m.id = o.memorial_id
  WHERE auth.uid() IS NOT NULL AND o.user_id = auth.uid()
    AND o.status IN ('paid','partially_refunded','free')
  ORDER BY o.created_at DESC;
$$;
REVOKE EXECUTE ON FUNCTION public.my_withdrawable_orders() FROM anon;