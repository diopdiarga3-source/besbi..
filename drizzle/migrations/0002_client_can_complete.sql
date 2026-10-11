create or replace function public.set_booking_status(_booking uuid, _status booking_status)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare b record; is_admin boolean; paid int; paidout int;
begin
  select * into b from public.bookings where id = _booking for update;
  if b is null then raise exception 'Introuvable'; end if;
  is_admin := public.has_role(auth.uid(),'admin');
  if _status in ('accepted','rejected') and not (b.provider_id = auth.uid() or is_admin) then raise exception 'Non autorisé'; end if;
  if _status in ('completed','cancelled') and not (b.client_id = auth.uid() or b.provider_id = auth.uid() or is_admin) then raise exception 'Non autorisé'; end if;
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
    if b.client_id = auth.uid() then perform public.notify(b.provider_id,'Prestation confirmée par le client', to_char(b.date,'DD/MM/YYYY'), '/pro/commandes'); end if;
  end if;
  perform public.notify(b.client_id, case _status when 'accepted' then 'Réservation confirmée' when 'rejected' then 'Réservation refusée' when 'completed' then 'Prestation terminée — laissez un avis' else 'Réservation annulée' end, to_char(b.date,'DD/MM/YYYY'), '/reservations');
  if _status = 'cancelled' then perform public.notify(b.provider_id,'Réservation annulée', to_char(b.date,'DD/MM/YYYY'), '/pro/commandes'); end if;
end $function$;