-- INVOICES
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  memorial_id uuid REFERENCES public.memorials(id) ON DELETE SET NULL,
  user_id uuid,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  stripe_refund_id text,
  stripe_livemode boolean NOT NULL DEFAULT false,
  customer_type text NOT NULL DEFAULT 'individual',
  customer_name text NOT NULL DEFAULT '',
  customer_email text NOT NULL DEFAULT '',
  customer_address text,
  customer_city text,
  customer_postal_code text,
  customer_country text DEFAULT 'HR',
  customer_oib text,
  customer_company text,
  customer_vat_id text,
  product_name text NOT NULL DEFAULT 'Digitalni memorijal',
  product_description text,
  quantity numeric NOT NULL DEFAULT 1,
  amount_net numeric,
  tax_rate numeric,
  tax_amount numeric,
  amount_gross numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  payment_method text NOT NULL DEFAULT 'card',
  invoice_status text NOT NULL DEFAULT 'pending',
  fiscalization_status text NOT NULL DEFAULT 'not_started',
  minimax_invoice_id text,
  minimax_invoice_number text,
  minimax_document_id text,
  minimax_pdf_url text,
  jir text,
  zki text,
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  next_retry_at timestamptz,
  stripe_paid_at timestamptz,
  invoice_created_at timestamptz,
  fiscalized_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX invoices_stripe_payment_intent_key ON public.invoices (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE UNIQUE INDEX invoices_stripe_session_key ON public.invoices (stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;
CREATE INDEX invoices_status_idx ON public.invoices (invoice_status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage invoices" ON public.invoices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners view own invoices" ON public.invoices FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- INVOICE LOGS
CREATE TABLE public.invoice_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  event text NOT NULL,
  status text,
  message text,
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invoice_logs_invoice_idx ON public.invoice_logs (invoice_id);

GRANT SELECT ON public.invoice_logs TO authenticated;
GRANT ALL ON public.invoice_logs TO service_role;
ALTER TABLE public.invoice_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read invoice logs" ON public.invoice_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- INVOICE SETTINGS (single row)
CREATE TABLE public.invoice_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  minimax_organisation_id text,
  default_customer_type text NOT NULL DEFAULT 'individual',
  default_item_name text NOT NULL DEFAULT 'Digitalni memorijal',
  default_item_code text,
  default_vat_rate numeric NOT NULL DEFAULT 25,
  vat_exempt boolean NOT NULL DEFAULT false,
  default_currency text NOT NULL DEFAULT 'EUR',
  default_payment_method text NOT NULL DEFAULT 'card',
  document_numbering text,
  test_mode boolean NOT NULL DEFAULT true,
  auto_issue boolean NOT NULL DEFAULT true,
  send_email_to_customer boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.invoice_settings TO authenticated;
GRANT ALL ON public.invoice_settings TO service_role;
ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage invoice settings" ON public.invoice_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_invoice_settings_updated_at BEFORE UPDATE ON public.invoice_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.invoice_settings (id) VALUES (gen_random_uuid());

-- BILLING DETAILS collected before Stripe
CREATE TABLE public.billing_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid REFERENCES public.memorials(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  customer_type text NOT NULL DEFAULT 'individual',
  full_name text NOT NULL,
  email text NOT NULL,
  address text,
  postal_code text,
  city text,
  country text NOT NULL DEFAULT 'HR',
  company_name text,
  oib text,
  vat_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX billing_details_memorial_key ON public.billing_details (memorial_id) WHERE memorial_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON public.billing_details TO authenticated;
GRANT ALL ON public.billing_details TO service_role;
ALTER TABLE public.billing_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own billing details" ON public.billing_details FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_billing_details_updated_at BEFORE UPDATE ON public.billing_details
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();