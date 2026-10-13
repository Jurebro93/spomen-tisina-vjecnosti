REVOKE EXECUTE ON FUNCTION public.mark_checkout_returned(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_sales_report(timestamptz, timestamptz, boolean, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_sales_state() FROM PUBLIC, anon;