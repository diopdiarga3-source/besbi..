REVOKE EXECUTE ON FUNCTION public.pay_booking(uuid, text, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pay_booking(uuid, text, boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.pay_booking(uuid, text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.pay_booking(uuid, text, boolean) TO service_role;