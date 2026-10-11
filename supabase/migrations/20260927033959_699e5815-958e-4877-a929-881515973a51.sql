insert into public.categories(name,slug,emoji,sort) select 'Tailleur','tailleur','🧵',18 where not exists (select 1 from public.categories where slug='tailleur');
insert into public.service_catalog(category_id,name,description,price,unit,duration_minutes,sort)
select c.id, v.n, v.d, v.p, 'forfait', 60, v.s from public.categories c,
(values ('Grand boubou homme','Confection sur mesure',35000,1),('Taille basse femme','Confection sur mesure',25000,2),('Robe de soirée','Confection sur mesure',40000,3),('Costume sur mesure','Veste + pantalon',60000,4),('Kaftan','Confection sur mesure',30000,5),('Tenue de mariage','Tenue complète des mariés',80000,6),('Tenues assorties (famille)','Par personne',20000,7),('Retouche / ajustement','Ourlet, cintrage...',3000,8),('Prise de mesures à domicile','Déplacement chez le client',5000,9)) v(n,d,p,s)
where c.slug='tailleur' and not exists (select 1 from public.service_catalog x where x.category_id=c.id);
alter table public.bookings add column if not exists measurements jsonb;
create or replace function public.set_booking_measurements(_booking uuid, _m jsonb) returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists (select 1 from bookings where id=_booking and client_id=auth.uid() and status in ('pending','accepted')) then raise exception 'Réservation introuvable'; end if;
  update bookings set measurements=_m where id=_booking;
end $$;
revoke execute on function public.set_booking_measurements(uuid,jsonb) from public, anon;
grant execute on function public.set_booking_measurements(uuid,jsonb) to authenticated;