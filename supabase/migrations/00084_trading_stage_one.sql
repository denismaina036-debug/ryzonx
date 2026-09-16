-- Additive trading discovery foundation. No wallet, ledger or pool changes.
begin;
create table public.trading_settings (
  id boolean primary key default true check (id),
  trading_enabled boolean not null default false,
  display_mode text not null default 'SIMULATION' check (display_mode in ('SIMULATION','LIVE_PREVIEW','LIVE')),
  execution_mode text not null default 'SIMULATED' check (execution_mode = 'SIMULATED'),
  updated_at timestamptz not null default now()
);
create table public.trading_asset_classes (
  asset_class text primary key check (asset_class in ('stocks','crypto','forex','commodities','indices','etfs','futures')),
  enabled boolean not null default true,
  check (asset_class <> 'futures' or not enabled)
);
create table public.trading_instruments (
  id uuid primary key default gen_random_uuid(),
  symbol text not null unique check (symbol ~ '^[A-Z0-9.]{1,24}$'),
  provider_symbol text not null,
  name text not null,
  asset_class text not null references public.trading_asset_classes(asset_class),
  base_currency text,
  quote_currency text not null default 'USD',
  currency text not null default 'USD',
  exchange text,
  price_precision integer not null default 2 check (price_precision between 0 and 12),
  quantity_precision integer not null default 8 check (quantity_precision between 0 and 12),
  minimum_trade_amount numeric(30,12) not null default 10 check (minimum_trade_amount > 0),
  maximum_trade_amount numeric(30,12) check (maximum_trade_amount >= minimum_trade_amount),
  buy_enabled boolean not null default true,
  sell_enabled boolean not null default true,
  trading_enabled boolean not null default true,
  featured boolean not null default false,
  market_status text not null default 'unknown' check (market_status in ('open','closed','unknown')),
  display_order integer not null default 0 check (display_order between 0 and 100000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (asset_class <> 'futures' or not trading_enabled)
);
create index trading_instruments_category_order on public.trading_instruments(asset_class, display_order);
create table public.trading_config_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  target text not null,
  before_value jsonb not null,
  after_value jsonb not null,
  created_at timestamptz not null default now()
);
create table public.trading_watchlist (
  user_id uuid not null references public.profiles(id) on delete cascade,
  instrument_id uuid not null references public.trading_instruments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, instrument_id)
);

alter table public.trading_settings enable row level security;
alter table public.trading_asset_classes enable row level security;
alter table public.trading_instruments enable row level security;
alter table public.trading_config_audit enable row level security;
alter table public.trading_watchlist enable row level security;
revoke all on public.trading_settings, public.trading_asset_classes, public.trading_instruments, public.trading_config_audit, public.trading_watchlist from anon, authenticated;
grant select on public.trading_settings, public.trading_asset_classes, public.trading_instruments to authenticated;
grant select, insert, delete on public.trading_watchlist to authenticated;
grant all on public.trading_settings, public.trading_asset_classes, public.trading_instruments, public.trading_config_audit, public.trading_watchlist to service_role;
create policy trading_settings_read on public.trading_settings for select to authenticated using (true);
create policy trading_classes_read on public.trading_asset_classes for select to authenticated using (true);
create policy trading_instruments_read on public.trading_instruments for select to authenticated using (true);
create policy trading_watchlist_read on public.trading_watchlist for select to authenticated using (user_id = auth.uid());
create policy trading_watchlist_add on public.trading_watchlist for insert to authenticated with check (user_id = auth.uid());
create policy trading_watchlist_remove on public.trading_watchlist for delete to authenticated using (user_id = auth.uid());

-- Service-only RPC: configuration change and audit entry commit atomically.
-- Actor comes from the authenticated admin API, never from the browser payload.
create function public.update_trading_configuration(p_actor uuid, p_kind text, p_target text, p_value jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare previous jsonb; current_value jsonb;
begin
  if not exists(select 1 from public.profiles where id = p_actor and role = 'administrator') then
    raise exception 'Administrator required';
  end if;
  if p_kind = 'settings' then
    if p_value->>'execution_mode' is distinct from 'SIMULATED' then raise exception 'Live execution unavailable'; end if;
    select to_jsonb(s) into previous from public.trading_settings s where id = true for update;
    update public.trading_settings set trading_enabled = (p_value->>'trading_enabled')::boolean,
      display_mode = p_value->>'display_mode', execution_mode = 'SIMULATED', updated_at = now() where id = true
      returning to_jsonb(trading_settings.*) into current_value;
  elsif p_kind = 'class' then
    select to_jsonb(c) into previous from public.trading_asset_classes c where asset_class = p_target for update;
    update public.trading_asset_classes set enabled = (p_value->>'enabled')::boolean where asset_class = p_target
      returning to_jsonb(trading_asset_classes.*) into current_value;
  elsif p_kind = 'instrument' then
    select to_jsonb(i) into previous from public.trading_instruments i where id = p_target::uuid for update;
    update public.trading_instruments set trading_enabled = (p_value->>'trading_enabled')::boolean,
      buy_enabled = (p_value->>'buy_enabled')::boolean, sell_enabled = (p_value->>'sell_enabled')::boolean,
      featured = (p_value->>'featured')::boolean, minimum_trade_amount = (p_value->>'minimum_trade_amount')::numeric,
      maximum_trade_amount = (p_value->>'maximum_trade_amount')::numeric,
      display_order = (p_value->>'display_order')::integer, updated_at = now() where id = p_target::uuid
      returning to_jsonb(trading_instruments.*) into current_value;
  else raise exception 'Unknown configuration target';
  end if;
  if previous is null or current_value is null then raise exception 'Configuration not found'; end if;
  insert into public.trading_config_audit(actor_id, target, before_value, after_value)
    values(p_actor, p_kind || ':' || p_target, previous, current_value);
end;
$$;
revoke all on function public.update_trading_configuration(uuid,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.update_trading_configuration(uuid,text,text,jsonb) to service_role;

insert into public.trading_settings(id) values(true);
insert into public.trading_asset_classes(asset_class, enabled) values
('stocks',true),('crypto',true),('forex',true),('commodities',true),('indices',true),('etfs',true),('futures',false);
-- Catalogue metadata only. Provider aliases must be verified against the chosen
-- licensed adapter before connecting it. No synthetic prices or balances.
insert into public.trading_instruments(symbol,provider_symbol,name,asset_class,base_currency,quote_currency,currency,exchange,price_precision,featured,display_order) values
('BTCUSD','BTC/USD','Bitcoin','crypto','BTC','USD','USD',null,2,true,10),
('ETHUSD','ETH/USD','Ethereum','crypto','ETH','USD','USD',null,2,false,20),
('SOLUSD','SOL/USD','Solana','crypto','SOL','USD','USD',null,2,false,30),
('XRPUSD','XRP/USD','XRP','crypto','XRP','USD','USD',null,5,false,40),
('EURUSD','EUR/USD','EUR/USD','forex','EUR','USD','USD',null,5,true,50),
('GBPUSD','GBP/USD','GBP/USD','forex','GBP','USD','USD',null,5,false,60),
('USDJPY','USD/JPY','USD/JPY','forex','USD','JPY','JPY',null,3,false,70),
('AUDUSD','AUD/USD','AUD/USD','forex','AUD','USD','USD',null,5,false,80),
('XAUUSD','XAU/USD','Gold','commodities','XAU','USD','USD',null,2,true,90),
('XAGUSD','XAG/USD','Silver','commodities','XAG','USD','USD',null,3,false,100),
('USOIL','WTI','Crude Oil','commodities',null,'USD','USD',null,2,false,110),
('AAPL','AAPL','Apple','stocks',null,'USD','USD','NASDAQ',2,true,120),
('MSFT','MSFT','Microsoft','stocks',null,'USD','USD','NASDAQ',2,false,130),
('NVDA','NVDA','NVIDIA','stocks',null,'USD','USD','NASDAQ',2,false,140),
('TSLA','TSLA','Tesla','stocks',null,'USD','USD','NASDAQ',2,false,150),
('SPX500','SPX','S&P 500','indices',null,'USD','USD',null,2,false,160),
('NAS100','NDX','NASDAQ 100','indices',null,'USD','USD',null,2,false,170),
('DJ30','DJI','Dow Jones 30','indices',null,'USD','USD',null,2,false,180),
('SPY','SPY','SPDR S&P 500 ETF','etfs',null,'USD','USD','NYSE ARCA',2,false,190),
('QQQ','QQQ','Invesco QQQ','etfs',null,'USD','USD','NASDAQ',2,false,200);
commit;
