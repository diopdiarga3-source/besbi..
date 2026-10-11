create or replace function public.taken_slots(_provider uuid, _date date)
returns table(start_time time) language sql stable security definer set search_path = public as $$
  select b.start_time from public.bookings b where b.provider_id = _provider and b.date = _date and b.status in ('pending','accepted')
$$;
revoke execute on function public.taken_slots(uuid,date) from public, anon;
grant execute on function public.taken_slots(uuid,date) to authenticated;