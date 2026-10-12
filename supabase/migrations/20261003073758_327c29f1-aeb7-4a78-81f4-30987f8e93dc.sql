REVOKE EXECUTE ON FUNCTION public.my_withdrawable_orders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_withdrawable_orders() TO authenticated;