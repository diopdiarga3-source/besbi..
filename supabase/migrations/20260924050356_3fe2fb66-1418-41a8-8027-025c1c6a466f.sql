DROP POLICY IF EXISTS "profiles read" ON public.profiles;
CREATE POLICY "profiles read" ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.bookings b WHERE (b.client_id = auth.uid() AND b.provider_id = profiles.id) OR (b.provider_id = auth.uid() AND b.client_id = profiles.id))
);