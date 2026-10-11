ALTER TABLE public.services ADD COLUMN IF NOT EXISTS options jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS event_prices jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS guest_price integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS guests_included integer NOT NULL DEFAULT 0;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS travel_zones jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS selected_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS guests integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_city text,
  ADD COLUMN IF NOT EXISTS extras_total integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.bookings_before_insert()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare s record; p record; rate numeric; crate numeric; opt jsonb; extras integer := 0; zfee integer; ev integer;
begin
  select * into s from public.services where id = new.service_id and active;
  if s is null then raise exception 'Service indisponible'; end if;
  select * into p from public.providers where id = s.provider_id;
  if new.date < current_date then raise exception 'Date passée'; end if;
  if exists (select 1 from public.blocked_dates where provider_id = p.id and date = new.date) then
    raise exception 'Le prestataire n''est pas disponible à cette date'; end if;
  if p.id = new.client_id then raise exception 'Vous ne pouvez pas réserver vos propres services'; end if;
  select value into rate from public.settings where key = 'commission_rate';
  select value into crate from public.settings where key = 'client_fee_rate';
  new.provider_id := p.id; new.status := 'pending'; new.payment_status := 'unpaid'; new.payment_method := null;
  new.quantity := greatest(1, least(coalesce(new.quantity,1), 10000));
  new.guests := greatest(0, least(coalesce(new.guests,0), 100000));
  -- options : seuls les libellés définis par le prestataire sont retenus, prix pris côté serveur
  select coalesce(jsonb_agg(o), '[]'::jsonb), coalesce(sum((o->>'price')::int),0) into opt, extras
    from jsonb_array_elements(s.options) o
    where jsonb_typeof(new.selected_options) = 'array' and new.selected_options ? (o->>'label');
  new.selected_options := opt;
  ev := 0;
  if new.event_type is not null and s.event_prices ? new.event_type then ev := coalesce((s.event_prices->>new.event_type)::int,0); end if;
  extras := extras + ev + greatest(0, new.guests - s.guests_included) * s.guest_price;
  new.extras_total := extras;
  new.subtotal := s.price * new.quantity + extras;
  zfee := null;
  if new.client_city is not null then
    select (z->>'fee')::int into zfee from jsonb_array_elements(p.travel_zones) z
      where lower(trim(z->>'city')) = lower(trim(new.client_city)) limit 1;
  end if;
  new.travel_fee := case when p.travel_possible then coalesce(zfee, p.travel_fee) else 0 end;
  new.platform_fee := round(new.subtotal * coalesce(crate,0) / 100);
  new.total := new.subtotal + new.travel_fee + new.platform_fee;
  new.commission := round(new.subtotal * coalesce(rate,10) / 100);
  new.provider_amount := new.subtotal + new.travel_fee - new.commission;
  return new;
end $function$;