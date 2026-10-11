DROP POLICY IF EXISTS "settings public" ON public.settings;
REVOKE SELECT ON public.settings FROM anon;
CREATE POLICY "settings read client fee" ON public.settings FOR SELECT TO authenticated USING (key = 'client_fee_rate');
CREATE POLICY "settings admin read" ON public.settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));