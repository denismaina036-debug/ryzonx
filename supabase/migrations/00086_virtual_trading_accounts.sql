-- Practice cash only; no financial or execution dependencies.
create table public.virtual_trading_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cash_usd numeric(30,2) not null default 10000 check (cash_usd >= 0),
  starting_balance_usd numeric(30,2) not null default 10000 check (starting_balance_usd > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.virtual_trading_accounts enable row level security;
revoke all on public.virtual_trading_accounts from public, anon, authenticated;
grant select on public.virtual_trading_accounts to authenticated;
create policy virtual_account_owner_read on public.virtual_trading_accounts
  for select to authenticated using (user_id = (select auth.uid()));

-- Server-only creation. No caller-supplied balance or reset operation.
create function public.ensure_virtual_trading_account(p_user uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare account public.virtual_trading_accounts;
begin
  insert into public.virtual_trading_accounts(user_id) values (p_user)
    on conflict (user_id) do nothing;
  select * into strict account from public.virtual_trading_accounts where user_id = p_user;
  return jsonb_build_object('user_id', account.user_id,
    'cash_usd', account.cash_usd::text, 'starting_balance_usd', account.starting_balance_usd::text,
    'created_at', account.created_at, 'updated_at', account.updated_at);
end;
$$;
revoke all on function public.ensure_virtual_trading_account(uuid) from public, anon, authenticated;
grant execute on function public.ensure_virtual_trading_account(uuid) to service_role;
