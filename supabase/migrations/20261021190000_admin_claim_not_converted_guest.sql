-- A guest who turns a draft into an account gets its e-mail confirmed without a link (convert-guest-account),
-- so such an account must never claim an admin invite by e-mail. Only accounts with a confirmed e-mail
-- that were not converted from a guest can claim the role.
CREATE OR REPLACE FUNCTION public.claim_admin_role()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_row public.admin_users;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT email INTO v_email FROM auth.users
  WHERE id = auth.uid()
    AND email_confirmed_at IS NOT NULL
    AND NOT coalesce(is_anonymous, false)
    AND coalesce(raw_app_meta_data->>'converted_guest', 'false') <> 'true';
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
$function$;
REVOKE ALL ON FUNCTION public.claim_admin_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_admin_role() TO authenticated;
