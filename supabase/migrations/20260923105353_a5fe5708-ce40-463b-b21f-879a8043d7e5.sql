REVOKE ALL ON FUNCTION public.sync_admin_role() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_promo_code_row() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_admin_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_admin_role() TO authenticated;