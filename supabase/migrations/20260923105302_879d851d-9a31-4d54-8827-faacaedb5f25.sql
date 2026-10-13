-- 1) ADMIN USERS ---------------------------------------------------------
CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  name text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE UNIQUE INDEX admin_users_email_lower_key ON public.admin_users (lower(email));
CREATE UNIQUE INDEX admin_users_user_id_key ON public.admin_users (user_id) WHERE user_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admins" ON public.admin_users
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can add admins" ON public.admin_users
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update admins" ON public.admin_users
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can remove admins" ON public.admin_users
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Keep user_roles in sync with admin_users (single source of truth for the role).
CREATE OR REPLACE FUNCTION public.sync_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.user_id IS NOT NULL THEN
      DELETE FROM public.user_roles WHERE user_id = OLD.user_id AND role = 'admin';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.user_id IS NOT NULL AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    DELETE FROM public.user_roles WHERE user_id = OLD.user_id AND role = 'admin';
  END IF;

  IF NEW.user_id IS NOT NULL THEN
    IF NEW.active THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
      DELETE FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'admin';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER admin_users_sync_role
AFTER INSERT OR UPDATE OR DELETE ON public.admin_users
FOR EACH ROW EXECUTE FUNCTION public.sync_admin_role();

-- Links an existing auth account to a pending admin_users row (called on sign-in).
CREATE OR REPLACE FUNCTION public.claim_admin_role()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_row public.admin_users;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL THEN RETURN false; END IF;

  SELECT * INTO v_row FROM public.admin_users WHERE lower(email) = lower(v_email) LIMIT 1;
  IF v_row.id IS NULL THEN RETURN false; END IF;

  IF v_row.user_id IS DISTINCT FROM auth.uid() THEN
    UPDATE public.admin_users SET user_id = auth.uid() WHERE id = v_row.id;
  ELSIF v_row.active THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN v_row.active;
END;
$$;

-- New signups with a pending admin record get the role immediately.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'given_name',
             split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name',''),' ',1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', NEW.raw_user_meta_data->>'family_name',
             NULLIF(substring(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name','') from position(' ' in COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name',' ')) + 1),'')),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  )
  ON CONFLICT (id) DO NOTHING;

  IF NEW.email IS NOT NULL THEN
    UPDATE public.admin_users SET user_id = NEW.id
    WHERE lower(email) = lower(NEW.email) AND user_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Carry over existing administrators so nobody loses access.
INSERT INTO public.admin_users (user_id, email, name, active)
SELECT ur.user_id,
       COALESCE(p.email, 'nepoznato@osmrtnica.com.hr'),
       NULLIF(btrim(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'')), ''),
       true
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role = 'admin'
ON CONFLICT DO NOTHING;

-- 2) PROMO CODES ---------------------------------------------------------
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  discount_type text NOT NULL,
  discount_value numeric NOT NULL DEFAULT 0,
  product_type text NOT NULL DEFAULT 'both',
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  max_uses integer,
  max_uses_per_user integer NOT NULL DEFAULT 1,
  current_uses integer NOT NULL DEFAULT 0,
  created_by_admin_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX promo_codes_code_lower_key ON public.promo_codes (lower(code));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view promo codes" ON public.promo_codes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create promo codes" ON public.promo_codes
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update promo codes" ON public.promo_codes
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete promo codes" ON public.promo_codes
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_promo_codes_updated_at
BEFORE UPDATE ON public.promo_codes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_promo_code_row()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.code := upper(btrim(NEW.code));
  IF NEW.code = '' THEN RAISE EXCEPTION 'Promo kod ne može biti prazan.'; END IF;
  IF NEW.discount_type NOT IN ('percentage','fixed','free') THEN
    RAISE EXCEPTION 'Nepoznata vrsta popusta: %', NEW.discount_type;
  END IF;
  IF NEW.product_type NOT IN ('memorial','obituary','both') THEN
    RAISE EXCEPTION 'Nepoznata vrsta proizvoda: %', NEW.product_type;
  END IF;
  IF NEW.discount_type = 'percentage' AND (NEW.discount_value <= 0 OR NEW.discount_value > 100) THEN
    RAISE EXCEPTION 'Postotni popust mora biti između 1 i 100.';
  END IF;
  IF NEW.discount_type = 'fixed' AND NEW.discount_value <= 0 THEN
    RAISE EXCEPTION 'Fiksni popust mora biti veći od 0.';
  END IF;
  IF NEW.discount_type = 'free' THEN NEW.discount_value := 100; END IF;
  IF NEW.max_uses IS NOT NULL AND NEW.max_uses < 1 THEN
    RAISE EXCEPTION 'Maksimalan broj korištenja mora biti najmanje 1.';
  END IF;
  IF NEW.max_uses_per_user < 1 THEN
    RAISE EXCEPTION 'Maksimalan broj korištenja po korisniku mora biti najmanje 1.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER promo_codes_validate
BEFORE INSERT OR UPDATE ON public.promo_codes
FOR EACH ROW EXECUTE FUNCTION public.validate_promo_code_row();

-- 3) PROMO CODE USAGE ----------------------------------------------------
CREATE TABLE public.promo_code_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid,
  order_id uuid,
  product_type text NOT NULL,
  original_price numeric NOT NULL,
  discount_amount numeric NOT NULL,
  final_price numeric NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX promo_code_usage_order_key
  ON public.promo_code_usage (promo_code_id, order_id) WHERE order_id IS NOT NULL;
CREATE INDEX promo_code_usage_code_idx ON public.promo_code_usage (promo_code_id);
CREATE INDEX promo_code_usage_user_idx ON public.promo_code_usage (user_id);

GRANT SELECT ON public.promo_code_usage TO authenticated;
GRANT ALL ON public.promo_code_usage TO service_role;

ALTER TABLE public.promo_code_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view promo usage" ON public.promo_code_usage
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4) MEMORIAL PAYMENT DETAILS -------------------------------------------
ALTER TABLE public.memorials
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_amount numeric,
  ADD COLUMN IF NOT EXISTS promo_code_id uuid REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promo_code text;