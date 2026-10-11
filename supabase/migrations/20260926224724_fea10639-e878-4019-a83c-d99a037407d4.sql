CREATE OR REPLACE FUNCTION public.share_booking_location(_booking uuid, _lat double precision, _lng double precision)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _lat IS NULL OR _lng IS NULL OR _lat < -90 OR _lat > 90 OR _lng < -180 OR _lng > 180 THEN
    RAISE EXCEPTION 'Coordonnées invalides';
  END IF;
  UPDATE public.bookings
  SET location_lat = _lat, location_lng = _lng
  WHERE id = _booking
    AND client_id = auth.uid()
    AND status IN ('pending', 'accepted');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Réservation introuvable ou non modifiable';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.share_booking_location(uuid, double precision, double precision) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.share_booking_location(uuid, double precision, double precision) TO authenticated;