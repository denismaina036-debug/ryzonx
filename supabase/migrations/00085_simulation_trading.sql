-- Simulation only. No existing wallet, ledger or pool tables are modified.
begin;
alter table public.trading_settings
 add column simulation_enabled boolean not null default false,
 add column buy_enabled boolean not null default true,
 add column sell_enabled boolean not null default true,
 add column stop_loss_enabled boolean not null default false,
 add column take_profit_enabled boolean not null default false,
 add column default_simulation_balance numeric(30,12) not null default 5000 check (default_simulation_balance > 0);
alter table public.trading_instruments add column enabled boolean not null default true;

create table public.simulation_accounts (
 user_id uuid primary key references public.profiles(id),
 environment text not null default 'SIMULATED' check(environment = 'SIMULATED'),
 currency text not null default 'USD' check(currency = 'USD'),
 starting_cash numeric(30,12) not null check(starting_cash > 0),
 cash numeric(30,12) not null check(cash >= 0),
 realized_pl numeric(30,12) not null default 0,
 created_at timestamptz not null default now()
);
create table public.simulation_positions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.simulation_accounts(user_id),
 instrument_id uuid not null references public.trading_instruments(id),
 environment text not null default 'SIMULATED' check(environment = 'SIMULATED'),
 currency text not null default 'USD' check(currency = 'USD'),
 side text not null check(side in ('BUY','SELL')), status text not null default 'OPEN' check(status in ('OPEN','CLOSED')),
 invested_amount numeric(30,12) not null check(invested_amount > 0), units numeric(30,12) not null check(units > 0),
 opening_price numeric(30,12) not null check(opening_price > 0), closing_price numeric(30,12) check(closing_price > 0),
 stop_loss numeric(30,12) check(stop_loss > 0), take_profit numeric(30,12) check(take_profit > 0),
 opened_at timestamptz not null default now(), closed_at timestamptz,
 opening_quote_timestamp timestamptz not null, closing_quote_timestamp timestamptz,
 opening_quote_source text not null check(opening_quote_source = 'twelve_data'),
 closing_quote_source text check(closing_quote_source = 'twelve_data'),
 opening_price_basis text not null check(opening_price_basis in ('BID','ASK','LAST')),
 closing_price_basis text check(closing_price_basis in ('BID','ASK','LAST')),
 realized_pl numeric(30,12), close_reason text check(close_reason in ('MANUAL','STOP_LOSS','TAKE_PROFIT')),
 check((status = 'OPEN' and closed_at is null and closing_price is null and realized_pl is null) or
       (status = 'CLOSED' and closed_at is not null and closing_price is not null and realized_pl is not null and closing_quote_timestamp is not null and closing_quote_source is not null and close_reason is not null))
);
create index simulation_positions_owner_status on public.simulation_positions(user_id,status);
-- Immutable cash journal and execution receipts. Opening allocation is held by
-- the position; close returns that allocation plus capped realized P/L.
create table public.simulation_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.simulation_accounts(user_id),
 position_id uuid references public.simulation_positions(id), environment text not null default 'SIMULATED' check(environment = 'SIMULATED'),
 currency text not null default 'USD' check(currency = 'USD'),
 kind text not null check(kind in ('INITIAL_CREDIT','OPEN','CLOSE')),
 idempotency_key uuid not null, request jsonb not null,
 cash_delta numeric(30,12) not null, cash_after numeric(30,12) not null check(cash_after >= 0),
 created_at timestamptz not null default now(), unique(user_id,idempotency_key)
);
create unique index simulation_one_initial_credit on public.simulation_events(user_id) where kind='INITIAL_CREDIT';
create unique index simulation_one_open on public.simulation_events(position_id) where kind='OPEN';
create unique index simulation_one_close on public.simulation_events(position_id) where kind='CLOSE';
alter table public.simulation_accounts enable row level security;
alter table public.simulation_positions enable row level security;
alter table public.simulation_events enable row level security;
revoke all on public.simulation_accounts,public.simulation_positions,public.simulation_events from public,anon,authenticated;
grant select on public.simulation_accounts,public.simulation_positions,public.simulation_events to authenticated;
grant all on public.simulation_accounts,public.simulation_positions,public.simulation_events to service_role;
create policy simulation_account_owner on public.simulation_accounts for select to authenticated using(user_id=auth.uid());
create policy simulation_position_owner on public.simulation_positions for select to authenticated using(user_id=auth.uid());
create policy simulation_event_owner on public.simulation_events for select to authenticated using(user_id=auth.uid());

create function public.simulation_immutable() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='DELETE' then raise exception 'Simulation records cannot be deleted'; end if;
 if TG_TABLE_NAME='simulation_events' then raise exception 'Simulation journal is immutable'; end if;
 if new.environment is distinct from old.environment or new.user_id is distinct from old.user_id or new.currency is distinct from old.currency then raise exception 'Immutable simulation identity'; end if;
 if TG_TABLE_NAME='simulation_accounts' then
   if new.starting_cash is distinct from old.starting_cash then raise exception 'Starting credit is immutable'; end if;
 elsif (to_jsonb(new) - array['status','closing_price','closed_at','closing_quote_timestamp','closing_quote_source','closing_price_basis','realized_pl','close_reason'])
    is distinct from (to_jsonb(old) - array['status','closing_price','closed_at','closing_quote_timestamp','closing_quote_source','closing_price_basis','realized_pl','close_reason']) or old.status='CLOSED' then
   raise exception 'Opening execution is immutable';
 end if;
 return new;
end $$;
create trigger simulation_accounts_immutable before update or delete on public.simulation_accounts for each row execute function public.simulation_immutable();
create trigger simulation_positions_immutable before update or delete on public.simulation_positions for each row execute function public.simulation_immutable();
create trigger simulation_events_immutable before update or delete on public.simulation_events for each row execute function public.simulation_immutable();

create function public.ensure_simulation_account(p_user uuid) returns void language plpgsql security definer set search_path='' as $$
declare s public.trading_settings; a public.simulation_accounts;
begin
 if not exists(select 1 from public.profiles where id=p_user and is_active=true) then raise exception 'Active account required'; end if;
 select * into s from public.trading_settings where id=true for share;
 if not s.simulation_enabled then raise exception 'Simulation disabled'; end if;
 insert into public.simulation_accounts(user_id,starting_cash,cash) values(p_user,s.default_simulation_balance,s.default_simulation_balance) on conflict do nothing;
 select * into a from public.simulation_accounts where user_id=p_user for update;
 insert into public.simulation_events(user_id,kind,idempotency_key,request,cash_delta,cash_after)
 values(p_user,'INITIAL_CREDIT',gen_random_uuid(),'{}',a.starting_cash,a.starting_cash) on conflict do nothing;
end $$;

-- Trusted server passes a normalized quote. Browser roles cannot execute RPCs.
create function public.simulation_quote_price(p_quote jsonb,p_symbol text,p_side text) returns numeric language plpgsql set search_path='' as $$
declare v numeric; t timestamptz;
begin
 if p_quote->>'source' is distinct from 'twelve_data' or p_quote->>'symbol' is distinct from p_symbol or p_quote->>'marketOpen' is distinct from 'true' then raise exception 'Tradable Twelve Data quote required'; end if;
 t := (p_quote->>'timestamp')::timestamptz;
 if t is null or t < clock_timestamp()-interval '60 seconds' or t > clock_timestamp()+interval '5 seconds' then raise exception 'Fresh quote required'; end if;
 if (p_quote->>'bid')::numeric > (p_quote->>'ask')::numeric then raise exception 'Invalid spread'; end if;
 v := coalesce((p_quote->>(case when p_side='BUY' then 'ask' else 'bid' end))::numeric,(p_quote->>'price')::numeric);
 if v is null or v<=0 or v::text in ('NaN','Infinity','-Infinity') then raise exception 'Valid price required'; end if;
 return v;
end $$;

create function public.open_simulation_position(p_user uuid,p_instrument uuid,p_side text,p_amount numeric,p_sl numeric,p_tp numeric,p_key uuid,p_quote jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.trading_settings; i public.trading_instruments; a public.simulation_accounts; prior public.simulation_events;
 req jsonb; price numeric; quantity numeric; pos uuid;
begin
 -- Lock account first for every mutation: serializes retries, close and open.
 select * into a from public.simulation_accounts where user_id=p_user for update;
 if not found then raise exception 'Create a simulation account first'; end if;
 if not exists(select 1 from public.profiles where id=p_user and is_active=true) then raise exception 'Active account required'; end if;
 req := jsonb_build_object('instrument',p_instrument,'side',p_side,'amount',p_amount::text,'sl',p_sl::text,'tp',p_tp::text);
 select * into prior from public.simulation_events where user_id=p_user and idempotency_key=p_key;
 if found then
   if prior.kind<>'OPEN' or prior.request<>req then raise exception 'Idempotency key already used'; end if;
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
 if p_amount is null or p_amount::text in ('NaN','Infinity','-Infinity') or p_amount<=0 or p_amount<>trunc(p_amount,12) or p_amount<i.minimum_trade_amount or p_amount>i.maximum_trade_amount then raise exception 'Invalid amount'; end if;
 if p_amount>a.cash then raise exception 'Insufficient simulation cash'; end if;
 price := public.simulation_quote_price(p_quote,i.symbol,p_side);
 if p_sl is not null and (not s.stop_loss_enabled or p_sl<=0 or p_sl::text in ('NaN','Infinity','-Infinity') or (p_side='BUY' and p_sl>=price) or (p_side='SELL' and p_sl<=price)) then raise exception 'Invalid stop loss'; end if;
 if p_tp is not null and (not s.take_profit_enabled or p_tp<=0 or p_tp::text in ('NaN','Infinity','-Infinity') or (p_side='BUY' and p_tp<=price) or (p_side='SELL' and p_tp>=price)) then raise exception 'Invalid take profit'; end if;
 quantity := trunc(p_amount/price,i.quantity_precision);
 if quantity<=0 then raise exception 'Amount below minimum quantity'; end if;
 insert into public.simulation_positions(user_id,instrument_id,side,invested_amount,units,opening_price,stop_loss,take_profit,opening_quote_timestamp,opening_quote_source,opening_price_basis)
 values(p_user,p_instrument,p_side,p_amount,quantity,price,p_sl,p_tp,(p_quote->>'timestamp')::timestamptz,'twelve_data',case when p_quote->>(case when p_side='BUY' then 'ask' else 'bid' end) is null then 'LAST' when p_side='BUY' then 'ASK' else 'BID' end) returning id into pos;
 update public.simulation_accounts set cash=cash-p_amount where user_id=p_user returning * into a;
 insert into public.simulation_events(user_id,position_id,kind,idempotency_key,request,cash_delta,cash_after) values(p_user,pos,'OPEN',p_key,req,-p_amount,a.cash);
 return pos;
end $$;

create function public.close_simulation_position(p_user uuid,p_position uuid,p_key uuid,p_reason text,p_quote jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare a public.simulation_accounts; p public.simulation_positions; prior public.simulation_events;
 i public.trading_instruments; s public.trading_settings; price numeric; pl numeric; req jsonb; triggered boolean;
begin
 select * into a from public.simulation_accounts where user_id=p_user for update;
 if not found then raise exception 'Simulation account missing'; end if;
 if not exists(select 1 from public.profiles where id=p_user and is_active=true) then raise exception 'Active account required'; end if;
 req:=jsonb_build_object('position',p_position,'reason',p_reason);
 select * into prior from public.simulation_events where user_id=p_user and idempotency_key=p_key;
 if found then
  if prior.kind<>'CLOSE' or prior.request<>req then raise exception 'Idempotency key already used'; end if;
  return prior.position_id;
 end if;
 select * into p from public.simulation_positions where id=p_position and user_id=p_user for update;
 if not found then raise exception 'Position not found'; end if;
 if p.status='CLOSED' then return p.id; end if;
 if p_reason is null or p_reason not in ('MANUAL','STOP_LOSS','TAKE_PROFIT') then raise exception 'Invalid close reason'; end if;
 select * into i from public.trading_instruments where id=p.instrument_id;
 select * into s from public.trading_settings where id=true for share;
 -- Closing remains possible when new trading is disabled, to allow risk exits.
 price:=public.simulation_quote_price(p_quote,i.symbol,case when p.side='BUY' then 'SELL' else 'BUY' end);
 if p_reason<>'MANUAL' then
   triggered:=case when p_reason='STOP_LOSS' then s.stop_loss_enabled and p.stop_loss is not null and (case when p.side='BUY' then price<=p.stop_loss else price>=p.stop_loss end)
     else s.take_profit_enabled and p.take_profit is not null and (case when p.side='BUY' then price>=p.take_profit else price<=p.take_profit end) end;
   if not coalesce(triggered,false) then raise exception 'Protection not triggered'; end if;
 end if;
 -- Explicit fully funded simulation model: loss limited to invested amount.
 -- Unit truncation residual remains included in invested value, preserving cash.
 pl:=greatest(-p.invested_amount,trunc((case when p.side='BUY' then price-p.opening_price else p.opening_price-price end)*p.units,12));
 update public.simulation_positions set status='CLOSED',closing_price=price,closed_at=now(),realized_pl=pl,close_reason=p_reason,
 closing_quote_timestamp=(p_quote->>'timestamp')::timestamptz,closing_quote_source='twelve_data',
 closing_price_basis=case when p_quote->>(case when p.side='BUY' then 'bid' else 'ask' end) is null then 'LAST' when p.side='BUY' then 'BID' else 'ASK' end where id=p.id;
 update public.simulation_accounts set cash=cash+p.invested_amount+pl,realized_pl=realized_pl+pl where user_id=p_user returning * into a;
 insert into public.simulation_events(user_id,position_id,kind,idempotency_key,request,cash_delta,cash_after) values(p_user,p.id,'CLOSE',p_key,req,p.invested_amount+pl,a.cash);
 return p.id;
end $$;

-- Extend existing admin transaction/audit rather than introduce a second control API.
alter function public.update_trading_configuration(uuid,text,text,jsonb) rename to update_trading_configuration_v1;
create function public.update_trading_configuration(p_actor uuid,p_kind text,p_target text,p_value jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare previous jsonb; current_value jsonb;
begin
 if not exists(select 1 from public.profiles where id=p_actor and role='administrator' and is_active=true) then raise exception 'Administrator required'; end if;
 if p_kind='settings' then select to_jsonb(s) into previous from public.trading_settings s where id=true for update;
 elsif p_kind='instrument' then select to_jsonb(i) into previous from public.trading_instruments i where id=p_target::uuid for update; end if;
 perform public.update_trading_configuration_v1(p_actor,p_kind,p_target,p_value);
 if p_kind='settings' then
   update public.trading_settings set simulation_enabled=(p_value->>'simulation_enabled')::boolean,buy_enabled=(p_value->>'buy_enabled')::boolean,sell_enabled=(p_value->>'sell_enabled')::boolean,
     stop_loss_enabled=(p_value->>'stop_loss_enabled')::boolean,take_profit_enabled=(p_value->>'take_profit_enabled')::boolean,default_simulation_balance=(p_value->>'default_simulation_balance')::numeric where id=true returning to_jsonb(trading_settings.*) into current_value;
 elsif p_kind='instrument' then
   update public.trading_instruments set enabled=(p_value->>'enabled')::boolean where id=p_target::uuid returning to_jsonb(trading_instruments.*) into current_value;
 end if;
 if current_value is not null then insert into public.trading_config_audit(actor_id,target,before_value,after_value) values(p_actor,p_kind||':'||p_target,previous,current_value); end if;
end $$;
revoke all on function public.ensure_simulation_account(uuid),public.simulation_quote_price(jsonb,text,text),public.open_simulation_position(uuid,uuid,text,numeric,numeric,numeric,uuid,jsonb),public.close_simulation_position(uuid,uuid,uuid,text,jsonb),public.update_trading_configuration(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.ensure_simulation_account(uuid),public.open_simulation_position(uuid,uuid,text,numeric,numeric,numeric,uuid,jsonb),public.close_simulation_position(uuid,uuid,uuid,text,jsonb),public.update_trading_configuration(uuid,text,text,jsonb) to service_role;
-- One statement snapshot keeps cash and positions consistent under concurrent fills.
create function public.simulation_snapshot(p_user uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('account',(select to_jsonb(a)||jsonb_build_object('cash',a.cash::text,'starting_cash',a.starting_cash::text,'realized_pl',a.realized_pl::text) from public.simulation_accounts a where user_id=p_user),
 'positions',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('invested_amount',p.invested_amount::text,'units',p.units::text,'opening_price',p.opening_price::text,'closing_price',p.closing_price::text,'stop_loss',p.stop_loss::text,'take_profit',p.take_profit::text,'realized_pl',p.realized_pl::text) order by p.opened_at desc) from public.simulation_positions p where user_id=p_user),'[]'::jsonb));
$$;
revoke all on function public.simulation_snapshot(uuid) from public,anon,authenticated;
grant execute on function public.simulation_snapshot(uuid) to service_role;
-- Durable round-robin cursor prevents later positions starving across job runs.
create table public.simulation_worker_state(id boolean primary key default true check(id),position_cursor uuid);
insert into public.simulation_worker_state(id) values(true);
alter table public.simulation_worker_state enable row level security;
revoke all on public.simulation_worker_state from public,anon,authenticated;
grant all on public.simulation_worker_state to service_role;
create function public.simulation_protection_batch() returns jsonb language plpgsql security definer set search_path='' as $$
declare cursor_id uuid; ids uuid[];
begin
 select position_cursor into cursor_id from public.simulation_worker_state where id=true for update;
 select array_agg(id order by id) into ids from (select id from public.simulation_positions where status='OPEN' and (stop_loss is not null or take_profit is not null) and (cursor_id is null or id>cursor_id) order by id limit 100) batch;
 if ids is null then
  select array_agg(id order by id) into ids from (select id from public.simulation_positions where status='OPEN' and (stop_loss is not null or take_profit is not null) order by id limit 100) batch;
 end if;
 update public.simulation_worker_state set position_cursor=ids[array_length(ids,1)] where id=true;
 return coalesce(to_jsonb(ids),'[]'::jsonb);
end $$;
revoke all on function public.simulation_protection_batch() from public,anon,authenticated;
grant execute on function public.simulation_protection_batch() to service_role;
commit;
