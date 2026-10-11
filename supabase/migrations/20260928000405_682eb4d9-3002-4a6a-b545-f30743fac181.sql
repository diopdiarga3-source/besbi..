ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS payout_name text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_reference text;
UPDATE public.providers SET payout_method='wave', payout_phone='761480637', payout_name='Mohamed Ndiouma DIOP' WHERE id='eac9ca65-161e-48f0-acf9-7e2fc5634a0b';
CREATE OR REPLACE FUNCTION public.declare_direct_payment(_booking uuid, _method text, _deposit boolean, _reference text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM bookings WHERE id=_booking AND client_id=auth.uid()) THEN RAISE EXCEPTION 'Réservation introuvable'; END IF;
  UPDATE bookings SET payment_reference = left(coalesce(_reference,''),100) WHERE id=_booking;
  PERFORM public.pay_booking(_booking, _method, _deposit);
END $$;
GRANT EXECUTE ON FUNCTION public.declare_direct_payment(uuid, text, boolean, text) TO authenticated;