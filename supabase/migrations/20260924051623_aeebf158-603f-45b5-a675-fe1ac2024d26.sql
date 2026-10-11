alter table public.providers add column if not exists payout_method text not null default 'wave',
  add column if not exists payout_phone text;

create or replace function public.pay_booking(_booking uuid, _method text, _deposit boolean default false)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare b record; amt int; pv record; share int;
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

  select * into pv from public.providers where id = b.provider_id;
  share := case when b.total > 0 then round(amt::numeric * b.provider_amount / b.total) else 0 end;
  if share > 0 then
    insert into public.transactions(booking_id,user_id,provider_id,amount,type,method,status)
    values (_booking,b.provider_id,b.provider_id,share,'payout',pv.payout_method,
            case when coalesce(pv.payout_phone,'') = '' then 'pending' else 'succeeded' end);
    if coalesce(pv.payout_phone,'') = '' then
      perform public.notify(b.provider_id,'Versement en attente', share || ' FCFA vous attendent : ajoutez votre numéro de versement', '/pro/profil');
    else
      perform public.notify(b.provider_id,'Argent reçu', share || ' FCFA envoyés sur votre ' || pv.payout_method || ' ' || pv.payout_phone, '/pro');
    end if;
  end if;
end $function$;

create or replace function public.set_booking_status(_booking uuid, _status booking_status)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare b record; is_admin boolean; paid int; paidout int;
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
    update public.transactions set status = 'cancelled' where booking_id = _booking and type='payout' and status='pending';
    select coalesce(sum(amount),0) into paidout from public.transactions where booking_id = _booking and type='payout' and status='succeeded';
    if paidout > 0 then
      insert into public.transactions(booking_id,user_id,provider_id,amount,type,method)
      values (_booking,b.provider_id,b.provider_id,-paidout,'payout','reprise');
    end if;
  end if;
  if _status = 'completed' then
    update public.providers set completed_count = completed_count + 1 where id = b.provider_id;
  end if;
  perform public.notify(b.client_id, case _status when 'accepted' then 'Réservation confirmée' when 'rejected' then 'Réservation refusée' when 'completed' then 'Prestation terminée — laissez un avis' else 'Réservation annulée' end, to_char(b.date,'DD/MM/YYYY'), '/reservations');
  if _status = 'cancelled' then perform public.notify(b.provider_id,'Réservation annulée', to_char(b.date,'DD/MM/YYYY'), '/pro/commandes'); end if;
end $function$;

create or replace function public.release_pending_payouts()
 returns int language plpgsql security definer set search_path to 'public'
as $function$
declare pv record; n int;
begin
  select * into pv from public.providers where id = auth.uid();
  if pv is null or coalesce(pv.payout_phone,'') = '' then return 0; end if;
  update public.transactions set status='succeeded', method=pv.payout_method
   where provider_id = pv.id and type='payout' and status='pending';
  get diagnostics n = row_count;
  return n;
end $function$;
revoke execute on function public.release_pending_payouts() from public, anon;
grant execute on function public.release_pending_payouts() to authenticated;