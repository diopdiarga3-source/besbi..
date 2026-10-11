create extension if not exists pg_net with schema extensions;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;
alter table public.push_subscriptions enable row level security;
create policy "push own select" on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
create policy "push own insert" on public.push_subscriptions for insert to authenticated with check (user_id = auth.uid());
create policy "push own update" on public.push_subscriptions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "push own delete" on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());

create or replace function public.notify_push()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  if exists (select 1 from public.push_subscriptions where user_id = new.user_id) then
    perform net.http_post(
      url := 'https://besbi.lovable.app/api/public/push-send',
      headers := jsonb_build_object('Content-Type','application/json','x-push-secret','e8cfebe667cc2bb3cacf51421e2349fb4e8fbaaea7b079d7'),
      body := jsonb_build_object('notification_id', new.id)
    );
  end if;
  return new;
end $$;
revoke execute on function public.notify_push() from public, anon, authenticated;

create trigger notifications_push after insert on public.notifications
for each row execute function public.notify_push();