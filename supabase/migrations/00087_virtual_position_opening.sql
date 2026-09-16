-- Reuse position/event storage. Legacy rows and balances are preserved, never copied.
begin;
alter table public.simulation_positions drop constraint simulation_positions_user_id_fkey;
alter table public.simulation_events drop constraint simulation_events_user_id_fkey;
alter table public.simulation_positions
 add foreign key (user_id) references public.profiles(id),
 add column virtual_account_user_id uuid references public.virtual_trading_accounts(user_id),
 add check (virtual_account_user_id is null or virtual_account_user_id=user_id);
alter table public.simulation_events
 add foreign key (user_id) references public.profiles(id),
 add column virtual_account_user_id uuid references public.virtual_trading_accounts(user_id),
 add check (virtual_account_user_id is null or virtual_account_user_id=user_id);
alter table public.simulation_positions drop constraint simulation_positions_opening_quote_source_check;
alter table public.simulation_positions add check (opening_quote_source in ('twelve_data','biquote'));

-- Identical free-provider eligibility and side-price policy to the server.
create function public.virtual_quote_price(p_quote jsonb,p_symbol text,p_side text)
returns numeric language plpgsql set search_path='' as $$
declare v numeric; t timestamptz; bid numeric; ask numeric; last_price numeric;
begin
 if p_quote->>'source' is distinct from 'biquote' or p_quote->>'symbol' is distinct from p_symbol
    or p_quote->>'stale'='true' or p_quote->>'marketState'='closed'
    or (p_quote->>'marketStatusKnown' is distinct from 'false' and p_quote->>'marketOpen' is distinct from 'true') then
   raise exception 'Fresh eligible free quote required';
 end if;
 t:=(p_quote->>'timestamp')::timestamptz;
 if t is null or t<clock_timestamp()-interval '60 seconds' or t>clock_timestamp()+interval '5 seconds' then raise exception 'Fresh quote required'; end if;
 bid:=(p_quote->>'bid')::numeric; ask:=(p_quote->>'ask')::numeric; last_price:=(p_quote->>'price')::numeric;
 if last_price is null or last_price<=0 or last_price::text in ('NaN','Infinity','-Infinity')
    or bid<=0 or ask<=0 or bid>ask or bid::text in ('NaN','Infinity','-Infinity') or ask::text in ('NaN','Infinity','-Infinity') then raise exception 'Invalid quote price'; end if;
 v:=case when p_side='BUY' then ask else bid end;
 if v is null and bid is null and ask is null then v:=last_price; end if;
 if v is null then raise exception 'Executable side price unavailable'; end if;
 return v;
end $$;
revoke all on function public.virtual_quote_price(jsonb,text,text) from public,anon,authenticated;

create or replace function public.open_simulation_position(p_user uuid,p_instrument uuid,p_side text,p_amount numeric,p_sl numeric,p_tp numeric,p_key uuid,p_quote jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.trading_settings; i public.trading_instruments; a public.virtual_trading_accounts; prior public.simulation_events;
 req jsonb; price numeric; quantity numeric; pos uuid;
begin
 -- Ensure and lock the only cash authority; the entire RPC is one transaction.
 perform public.ensure_virtual_trading_account(p_user);
 select * into a from public.virtual_trading_accounts where user_id=p_user for update;
 if not found then raise exception 'Virtual account unavailable'; end if;
 if not exists(select 1 from public.profiles where id=p_user and is_active=true) then raise exception 'Active account required'; end if;
 req := jsonb_build_object('instrument',p_instrument,'side',p_side,'amount',p_amount::text,'sl',p_sl::text,'tp',p_tp::text);
 select * into prior from public.simulation_events where user_id=p_user and idempotency_key=p_key;
 if found then
   if prior.virtual_account_user_id is distinct from p_user or prior.kind<>'OPEN' or prior.request<>req then raise exception 'Idempotency key already used'; end if;
   return prior.position_id;
 end if;
 select * into s from public.trading_settings where id=true for share;
 select * into i from public.trading_instruments where id=p_instrument for share;
 if not found or not i.enabled or not i.trading_enabled then raise exception 'Instrument disabled'; end if;
 perform 1 from public.trading_asset_classes where asset_class=i.asset_class and enabled and asset_class<>'futures' for share;
 if not found then raise exception 'Asset class disabled'; end if;
 if not s.trading_enabled or not s.simulation_enabled or s.execution_mode<>'SIMULATED' then raise exception 'Simulation trading disabled'; end if;
 if p_side is null or p_side not in ('BUY','SELL') or (p_side='BUY' and (not s.buy_enabled or not i.buy_enabled)) or (p_side='SELL' and (not s.sell_enabled or not i.sell_enabled)) then raise exception 'Side disabled'; end if;
 if i.currency<>'USD' or i.quote_currency<>'USD' then raise exception 'USD quotes only'; end if;
 if p_amount is null or p_amount::text in ('NaN','Infinity','-Infinity') or p_amount<=0 or p_amount<>trunc(p_amount,2) or p_amount<i.minimum_trade_amount or p_amount>i.maximum_trade_amount then raise exception 'Invalid amount'; end if;
 if p_amount>a.cash_usd then raise exception 'Insufficient virtual cash'; end if;
 price := public.virtual_quote_price(p_quote,i.symbol,p_side);
 if p_sl is not null or p_tp is not null then raise exception 'Protection is not supported for virtual opening'; end if;
 quantity := trunc(p_amount/price,i.quantity_precision);
 if quantity<=0 then raise exception 'Amount below minimum quantity'; end if;
 insert into public.simulation_positions(virtual_account_user_id,user_id,instrument_id,side,invested_amount,units,opening_price,stop_loss,take_profit,opening_quote_timestamp,opening_quote_source,opening_price_basis)
 values(p_user,p_user,p_instrument,p_side,p_amount,quantity,price,p_sl,p_tp,(p_quote->>'timestamp')::timestamptz,p_quote->>'source',case when p_quote->>(case when p_side='BUY' then 'ask' else 'bid' end) is null then 'LAST' when p_side='BUY' then 'ASK' else 'BID' end) returning id into pos;
 update public.virtual_trading_accounts set cash_usd=cash_usd-p_amount,updated_at=now() where user_id=p_user returning * into a;
 insert into public.simulation_events(virtual_account_user_id,user_id,position_id,kind,idempotency_key,request,cash_delta,cash_after) values(p_user,p_user,pos,'OPEN',p_key,req,-p_amount,a.cash_usd);
 return pos;
end $$;


-- Older settlement must never write a virtual position or use its legacy cash account.
alter function public.close_simulation_position(uuid,uuid,uuid,text,jsonb) rename to close_legacy_simulation_position;
revoke all on function public.close_legacy_simulation_position(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated,service_role;
create function public.close_simulation_position(p_user uuid,p_position uuid,p_key uuid,p_reason text,p_quote jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.simulation_positions where id=p_position and virtual_account_user_id is not null) then
   raise exception 'Virtual position closing is not available';
 end if;
 return public.close_legacy_simulation_position(p_user,p_position,p_key,p_reason,p_quote);
end $$;
revoke all on function public.close_simulation_position(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.close_simulation_position(uuid,uuid,uuid,text,jsonb) to service_role;
-- Legacy snapshot excludes virtual positions; the new ticket reads virtual cash directly.
create or replace function public.simulation_snapshot(p_user uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('account',(select to_jsonb(a)||jsonb_build_object('cash',a.cash::text,'starting_cash',a.starting_cash::text,'realized_pl',a.realized_pl::text) from public.simulation_accounts a where user_id=p_user),
 'positions',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('invested_amount',p.invested_amount::text,'units',p.units::text,'opening_price',p.opening_price::text,'closing_price',p.closing_price::text,'stop_loss',p.stop_loss::text,'take_profit',p.take_profit::text,'realized_pl',p.realized_pl::text) order by p.opened_at desc) from public.simulation_positions p where user_id=p_user and virtual_account_user_id is null),'[]'::jsonb));
$$;
commit;
