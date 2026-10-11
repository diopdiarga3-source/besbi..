CREATE OR REPLACE FUNCTION public.pay_booking(_booking uuid, _method text, _deposit boolean DEFAULT false)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
    values (_booking,b.provider_id,b.provider_id,share,'payout',pv.payout_method,'pending');
    if coalesce(pv.payout_phone,'') = '' then
      perform public.notify(b.provider_id,'Versement en attente', share || ' FCFA vous attendent : ajoutez votre numéro de versement', '/pro/profil');
    end if;
  end if;
end $function$;

CREATE OR REPLACE FUNCTION public.release_pending_payouts()
 RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $$ select count(*)::int from public.transactions where provider_id = auth.uid() and type='payout' and status='pending' $$;