create table public.favorites (
  user_id uuid not null,
  provider_id uuid not null references public.providers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, provider_id)
);
grant select, insert, delete on public.favorites to authenticated;
grant all on public.favorites to service_role;
alter table public.favorites enable row level security;
create policy "fav own" on public.favorites for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.providers add column portfolio text[] not null default '{}';
update public.providers set portfolio = array[cover_url,
 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800',
 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=800',
 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800'];