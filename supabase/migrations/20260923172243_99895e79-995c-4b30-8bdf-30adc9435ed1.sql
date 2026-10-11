-- ROLES
create type public.app_role as enum ('admin','provider','client');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles read" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- PROFILES
create table public.profiles (
  id uuid primary key,
  full_name text not null default '',
  phone text,
  city text,
  avatar_url text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles read" on public.profiles for select to authenticated using (true);
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles insert own" on public.profiles for insert to authenticated with check (id = auth.uid());

-- CATEGORIES
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  emoji text not null default '✨',
  sort int not null default 0
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "categories public" on public.categories for select using (true);
create policy "categories admin" on public.categories for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- PROVIDERS
create table public.providers (
  id uuid primary key,
  business_name text not null,
  description text not null default '',
  city text not null default 'Dakar',
  zone text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  avatar_url text,
  cover_url text,
  verified boolean not null default false,
  travel_possible boolean not null default true,
  delivery_available boolean not null default false,
  travel_fee int not null default 0,
  rating_avg numeric(3,2) not null default 0,
  reviews_count int not null default 0,
  completed_count int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.providers to anon, authenticated;
grant insert, update, delete on public.providers to authenticated;
grant all on public.providers to service_role;
alter table public.providers enable row level security;
create policy "providers public" on public.providers for select using (true);
create policy "providers insert own" on public.providers for insert to authenticated with check (id = auth.uid() and verified = false);
create policy "providers update own" on public.providers for update to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "providers admin delete" on public.providers for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- prevent providers from self-verifying / editing counters
create or replace function public.providers_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') and auth.uid() is not null then
    new.verified := old.verified;
    new.rating_avg := old.rating_avg;
    new.reviews_count := old.reviews_count;
    new.completed_count := old.completed_count;
  end if;
  return new;
end $$;
create trigger providers_guard before update on public.providers for each row execute function public.providers_guard();

-- SERVICES
create table public.services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  name text not null,
  description text not null default '',
  price int not null check (price >= 0),
  unit text not null default 'forfait', -- forfait | unite | jour | heure
  duration_minutes int not null default 60,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.services to anon, authenticated;
grant insert, update, delete on public.services to authenticated;
grant all on public.services to service_role;
alter table public.services enable row level security;
create policy "services public" on public.services for select using (true);
create policy "services own" on public.services for all to authenticated using (provider_id = auth.uid()) with check (provider_id = auth.uid());

-- AVAILABILITY
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null
);
grant select on public.availability to anon, authenticated;
grant insert, update, delete on public.availability to authenticated;
grant all on public.availability to service_role;
alter table public.availability enable row level security;
create policy "availability public" on public.availability for select using (true);
create policy "availability own" on public.availability for all to authenticated using (provider_id = auth.uid()) with check (provider_id = auth.uid());

create table public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  date date not null,
  reason text,
  unique (provider_id, date)
);
grant select on public.blocked_dates to anon, authenticated;
grant insert, update, delete on public.blocked_dates to authenticated;
grant all on public.blocked_dates to service_role;
alter table public.blocked_dates enable row level security;
create policy "blocked public" on public.blocked_dates for select using (true);
create policy "blocked own" on public.blocked_dates for all to authenticated using (provider_id = auth.uid()) with check (provider_id = auth.uid());

-- SETTINGS
create table public.settings (
  key text primary key,
  value numeric not null
);
grant select on public.settings to anon, authenticated;
grant update on public.settings to authenticated;
grant all on public.settings to service_role;
alter table public.settings enable row level security;
create policy "settings public" on public.settings for select using (true);
create policy "settings admin" on public.settings for update to authenticated using (public.has_role(auth.uid(),'admin'));
insert into public.settings values ('commission_rate', 10), ('client_fee_rate', 2);

-- BOOKINGS
create type public.booking_status as enum ('pending','accepted','rejected','completed','cancelled');
create type public.payment_status as enum ('unpaid','deposit','paid','refunded');
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  provider_id uuid not null references public.providers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  date date not null,
  start_time time not null,
  quantity int not null default 1 check (quantity > 0),
  location text not null default '',
  notes text not null default '',
  subtotal int not null default 0,
  travel_fee int not null default 0,
  platform_fee int not null default 0,
  total int not null default 0,
  commission int not null default 0,
  provider_amount int not null default 0,
  status booking_status not null default 'pending',
  payment_status payment_status not null default 'unpaid',
  payment_method text,
  created_at timestamptz not null default now()
);
create unique index bookings_slot_unique on public.bookings (provider_id, date, start_time) where status in ('pending','accepted');
grant select, insert on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;
create policy "bookings read" on public.bookings for select to authenticated
  using (client_id = auth.uid() or provider_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "bookings insert" on public.bookings for insert to authenticated with check (client_id = auth.uid());

create or replace function public.bookings_before_insert() returns trigger language plpgsql security definer set search_path = public as $$
declare s record; p record; rate numeric; crate numeric;
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
  new.provider_id := p.id;
  new.status := 'pending';
  new.payment_status := 'unpaid';
  new.payment_method := null;
  new.subtotal := s.price * new.quantity;
  new.travel_fee := case when p.travel_possible then p.travel_fee else 0 end;
  new.platform_fee := round(new.subtotal * coalesce(crate,0) / 100);
  new.total := new.subtotal + new.travel_fee + new.platform_fee;
  new.commission := round(new.subtotal * coalesce(rate,10) / 100);
  new.provider_amount := new.subtotal + new.travel_fee - new.commission;
  return new;
end $$;
create trigger bookings_before_insert before insert on public.bookings for each row execute function public.bookings_before_insert();

-- TRANSACTIONS
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  user_id uuid not null,
  provider_id uuid,
  amount int not null,
  type text not null, -- payment | refund | payout
  method text not null,
  status text not null default 'succeeded',
  reference text not null default ('BB-' || upper(substr(md5(random()::text),1,10))),
  created_at timestamptz not null default now()
);
grant select on public.transactions to authenticated;
grant all on public.transactions to service_role;
alter table public.transactions enable row level security;
create policy "tx read" on public.transactions for select to authenticated
  using (user_id = auth.uid() or provider_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- NOTIFICATIONS
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  body text not null default '',
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notif own" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notif update own" on public.notifications for update to authenticated using (user_id = auth.uid());
create policy "notif delete own" on public.notifications for delete to authenticated using (user_id = auth.uid());

create or replace function public.notify(_user uuid, _title text, _body text, _link text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications(user_id,title,body,link) values (_user,_title,_body,_link);
$$;
revoke execute on function public.notify(uuid,text,text,text) from public, anon, authenticated;

create or replace function public.bookings_after_insert() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify(new.provider_id, 'Nouvelle commande', 'Une nouvelle demande de réservation pour le ' || to_char(new.date,'DD/MM/YYYY'), '/pro/commandes');
  return new;
end $$;
create trigger bookings_after_insert after insert on public.bookings for each row execute function public.bookings_after_insert();

-- PAYMENT (simulated)
create or replace function public.pay_booking(_booking uuid, _method text, _deposit boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare b record; amt int;
begin
  select * into b from public.bookings where id = _booking for update;
  if b is null or b.client_id <> auth.uid() then raise exception 'Réservation introuvable'; end if;
  if b.status in ('rejected','cancelled') then raise exception 'Réservation non payable'; end if;
  if b.payment_status = 'paid' then raise exception 'Déjà payée'; end if;
  if _method not in ('wave','orange_money','card','free_money') then raise exception 'Moyen de paiement invalide'; end if;
  if _deposit and b.payment_status = 'unpaid' then
    amt := ceil(b.total * 0.3);
    update public.bookings set payment_status = 'deposit', payment_method = _method where id = _booking;
  else
    amt := case when b.payment_status = 'deposit' then b.total - ceil(b.total*0.3) else b.total end;
    update public.bookings set payment_status = 'paid', payment_method = _method where id = _booking;
  end if;
  insert into public.transactions(booking_id,user_id,provider_id,amount,type,method) values (_booking,b.client_id,b.provider_id,amt,'payment',_method);
  perform public.notify(b.client_id,'Paiement confirmé', amt || ' FCFA payés', '/reservations');
  perform public.notify(b.provider_id,'Paiement reçu', amt || ' FCFA reçus pour une réservation', '/pro/commandes');
end $$;
grant execute on function public.pay_booking(uuid,text,boolean) to authenticated;

-- STATUS TRANSITIONS
create or replace function public.set_booking_status(_booking uuid, _status booking_status)
returns void language plpgsql security definer set search_path = public as $$
declare b record; is_admin boolean; paid int;
begin
  select * into b from public.bookings where id = _booking for update;
  if b is null then raise exception 'Introuvable'; end if;
  is_admin := public.has_role(auth.uid(),'admin');
  if _status in ('accepted','rejected','completed') and not (b.provider_id = auth.uid() or is_admin) then raise exception 'Non autorisé'; end if;
  if _status = 'cancelled' and not (b.client_id = auth.uid() or b.provider_id = auth.uid() or is_admin) then raise exception 'Non autorisé'; end if;
  if _status = 'accepted' and b.status <> 'pending' then raise exception 'Transition invalide'; end if;
  if _status = 'rejected' and b.status <> 'pending' then raise exception 'Transition invalide'; end if;
  if _status = 'completed' and b.status <> 'accepted' then raise exception 'Transition invalide'; end if;
  if _status = 'cancelled' and b.status not in ('pending','accepted') then raise exception 'Transition invalide'; end if;
  if _status = 'cancelled' and b.client_id = auth.uid() and b.date <= current_date + 1 and b.status = 'accepted' then
    raise exception 'Annulation impossible moins de 48h avant la prestation'; end if;

  update public.bookings set status = _status where id = _booking;

  if _status in ('rejected','cancelled') and b.payment_status in ('paid','deposit') then
    select coalesce(sum(amount),0) into paid from public.transactions where booking_id = _booking and type='payment';
    update public.bookings set payment_status = 'refunded' where id = _booking;
    insert into public.transactions(booking_id,user_id,provider_id,amount,type,method) values (_booking,b.client_id,b.provider_id,-paid,'refund',coalesce(b.payment_method,'wave'));
    perform public.notify(b.client_id,'Remboursement', paid || ' FCFA remboursés', '/reservations');
  end if;
  if _status = 'completed' then
    update public.providers set completed_count = completed_count + 1 where id = b.provider_id;
  end if;
  perform public.notify(b.client_id, case _status when 'accepted' then 'Réservation confirmée' when 'rejected' then 'Réservation refusée' when 'completed' then 'Prestation terminée — laissez un avis' else 'Réservation annulée' end, to_char(b.date,'DD/MM/YYYY'), '/reservations');
  if _status = 'cancelled' then perform public.notify(b.provider_id,'Réservation annulée', to_char(b.date,'DD/MM/YYYY'), '/pro/commandes'); end if;
end $$;
grant execute on function public.set_booking_status(uuid,booking_status) to authenticated;

-- MESSAGES
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_id uuid not null,
  content text not null check (char_length(content) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create or replace function public.is_booking_party(_booking uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.bookings where id=_booking and (client_id=auth.uid() or provider_id=auth.uid()))
$$;
create policy "msg read" on public.messages for select to authenticated using (public.is_booking_party(booking_id));
create policy "msg insert" on public.messages for insert to authenticated with check (sender_id = auth.uid() and public.is_booking_party(booking_id));
create policy "msg mark read" on public.messages for update to authenticated using (public.is_booking_party(booking_id) and sender_id <> auth.uid());
alter publication supabase_realtime add table public.messages;

create or replace function public.messages_after_insert() returns trigger language plpgsql security definer set search_path = public as $$
declare b record;
begin
  select * into b from public.bookings where id = new.booking_id;
  perform public.notify(case when new.sender_id = b.client_id then b.provider_id else b.client_id end, 'Nouveau message', left(new.content,80), '/messages/' || new.booking_id);
  return new;
end $$;
create trigger messages_after_insert after insert on public.messages for each row execute function public.messages_after_insert();

-- REVIEWS
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  provider_id uuid not null,
  client_id uuid not null,
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  reported boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "reviews public" on public.reviews for select using (true);
create policy "reviews insert" on public.reviews for insert to authenticated with check (
  client_id = auth.uid() and exists(select 1 from public.bookings b where b.id = booking_id and b.client_id = auth.uid() and b.status='completed' and b.provider_id = reviews.provider_id));
create policy "reviews admin" on public.reviews for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "reviews admin upd" on public.reviews for update to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.report_review(_review uuid) returns void language sql security definer set search_path = public as $$
  update public.reviews set reported = true where id = _review and auth.uid() is not null;
$$;
grant execute on function public.report_review(uuid) to authenticated;

create or replace function public.reviews_refresh() returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid := coalesce(new.provider_id, old.provider_id);
begin
  update public.providers set
    rating_avg = coalesce((select avg(rating) from public.reviews where provider_id = pid),0),
    reviews_count = (select count(*) from public.reviews where provider_id = pid)
  where id = pid;
  if tg_op = 'INSERT' then perform public.notify(pid,'Nouvel avis', new.rating || '/5 — ' || left(new.comment,60), '/pro'); end if;
  return null;
end $$;
create trigger reviews_refresh after insert or delete on public.reviews for each row execute function public.reviews_refresh();

-- SIGNUP
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare r text := coalesce(new.raw_user_meta_data->>'role','client');
begin
  insert into public.profiles(id, full_name, phone, city)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), coalesce(new.raw_user_meta_data->>'phone', new.phone), new.raw_user_meta_data->>'city');
  insert into public.user_roles(user_id, role) values (new.id, 'client');
  if r = 'provider' then insert into public.user_roles(user_id, role) values (new.id, 'provider'); end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.become_provider() returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_roles(user_id, role) values (auth.uid(),'provider') on conflict do nothing;
end $$;
grant execute on function public.become_provider() to authenticated;

-- SEED CATEGORIES
insert into public.categories(name,slug,emoji,sort) values
('Maquillage','maquillage','💄',1),('Photographe','photographe','📸',2),('Vidéaste','videaste','🎥',3),
('Location de chaises','chaises','🪑',4),('Location de bâches','baches','⛺',5),('Matériel événementiel','materiel','🎪',6),
('Location de vêtements','vetements','👗',7),('Décoration','decoration','💐',8),('Coiffure','coiffure','💇',9),
('Gâteaux & pâtisserie','patisserie','🎂',10),('Traiteur','traiteur','🍽️',11),('Location de véhicules','vehicules','🚗',12),
('DJ & animation','dj','🎤',13),('Sonorisation','sonorisation','💡',14),('Organisation de mariage','mariage','💍',15),
('Location de salles','salles','📍',16),('Autres services','autres','🎨',17);

-- SEED DEMO PROVIDERS
insert into public.providers(id,business_name,description,city,zone,category_id,verified,travel_fee,rating_avg,reviews_count,completed_count,cover_url) values
('00000000-0000-0000-0000-000000000001','Awa Beauty Studio','Maquillage mariée, soirée et shooting. 8 ans d''expérience, produits haut de gamme.','Dakar','Dakar, Rufisque, Thiès',(select id from categories where slug='maquillage'),true,5000,4.9,128,340,'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=1200'),
('00000000-0000-0000-0000-000000000002','Studio Teranga Photo','Photographe mariage & événements. Reportage complet, album et retouches.','Dakar','Tout le Sénégal',(select id from categories where slug='photographe'),true,10000,4.8,86,210,'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200'),
('00000000-0000-0000-0000-000000000003','Baol Location','Location de chaises, bâches et tables pour cérémonies. Livraison et installation.','Diourbel','Diourbel, Touba, Mbacké',(select id from categories where slug='chaises'),true,15000,4.6,54,410,'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200'),
('00000000-0000-0000-0000-000000000004','DJ Khadim','DJ & animation mariages, baptêmes, soirées. Sono professionnelle incluse.','Thiès','Thiès, Dakar, Mbour',(select id from categories where slug='dj'),false,20000,4.7,41,150,'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200'),
('00000000-0000-0000-0000-000000000005','Délices de Fatou','Traiteur sénégalais et international. Thiéboudienne, yassa, buffets.','Dakar','Dakar et banlieue',(select id from categories where slug='traiteur'),true,0,4.9,97,260,'https://images.unsplash.com/photo-1555244162-803834f70033?w=1200'),
('00000000-0000-0000-0000-000000000006','Élégance Déco','Décoration florale et scénographie de mariages et fêtes.','Saint-Louis','Nord du Sénégal',(select id from categories where slug='decoration'),false,10000,4.5,23,70,'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200');

update public.providers set delivery_available = true where id = '00000000-0000-0000-0000-000000000003';

insert into public.services(provider_id,name,description,price,unit,duration_minutes) values
('00000000-0000-0000-0000-000000000001','Maquillage mariée','Essai inclus, retouches la journée',75000,'forfait',180),
('00000000-0000-0000-0000-000000000001','Maquillage soirée','',25000,'forfait',90),
('00000000-0000-0000-0000-000000000002','Reportage mariage','Journée complète + 300 photos retouchées',250000,'forfait',600),
('00000000-0000-0000-0000-000000000002','Shooting portrait','1h en studio ou extérieur',40000,'forfait',60),
('00000000-0000-0000-0000-000000000003','Chaise plastique','Prix par chaise, par jour',250,'unite',1440),
('00000000-0000-0000-0000-000000000003','Bâche 10x5 m','Montage inclus',35000,'jour',1440),
('00000000-0000-0000-0000-000000000004','Animation mariage','5h, sono + lumières',150000,'forfait',300),
('00000000-0000-0000-0000-000000000005','Buffet sénégalais','Prix par personne',6000,'unite',240),
('00000000-0000-0000-0000-000000000006','Décoration salle','Fleurs, nappes, arche',200000,'forfait',480);

insert into public.availability(provider_id,weekday,start_time,end_time)
select p.id, d, '09:00', '18:00' from public.providers p cross join generate_series(0,6) d;
