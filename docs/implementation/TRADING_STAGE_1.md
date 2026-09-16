# Trading Stage 1 — dependency map and boundaries

## Audit before implementation

RyvonX runs Next.js 16 App Router, React 19, Supabase SSR/Auth/Postgres,
Tailwind 4 and shared Radix UI primitives. Route groups separate public,
authenticated investor, pool-manager and administrator shells. Middleware
guards pages; new API endpoints must independently validate an active user and
administrator role for configuration writes.

Existing dependency map:

- Auth session → Supabase Auth → profiles → existing role/permission guards.
- Investor dashboard → investor financial service → funding wallet projection,
  pool allocations, investment cycles and profit distributions.
- Deposit/withdrawal workflows → existing ledger service → double-entry accounts
  and transactions, idempotency and financial event migrations.
- Admin shell → role guard → existing feature services and audit logs.
- Investor navigation → shared desktop sidebar and separate mobile bottom bar.
- Existing crypto-price helper → CoinGecko deposit valuation; its fallback of 1
  is unsuitable for executable trading quotes. Leave this helper unchanged.
- Platform reference data → generic editable labels/metadata; not a market
  authority or appropriate store for trade eligibility.

New dependency map:

Trading pages → authenticated trading API → catalogue/settings repository and
market-data service → MarketDataProvider. Trade ticket → shared deterministic
domain calculations (estimates only). TradingService → OrderService →
ExecutionRouter → SimulationExecutionProvider (Stage 1 always rejects submission).
LiveBrokerExecutionProvider is a contract only. No balance or ledger dependency.

Dedicated additive trading tables keep instrument controls and audit events
separate from pool trades. Settings display mode never selects an execution
provider. Future order, execution and position contracts retain immutable actual
execution environment and correlation identifiers. USD, 1x only.

No migration reset, existing financial schema rewrite or production settlement
is part of this stage. Migration installation and a licensed real provider are
operational prerequisites; unavailable data is explicitly represented.

## Implementation inventory

Created:

- `src/domain/trading/{models,calculations,market-data,execution}.ts` and domain tests.
- `src/services/trading/{repository,provider,market-data-service,http}.ts` and provider tests.
- `src/features/trading/`: shared Discover/category view, market cards/list,
  detail/chart, trade ticket, watchlist queries, portfolio foundation, scoped CSS,
  admin controls and presentation tests.
- Investor pages: `/dashboard/discover`, `/dashboard/discover/[category]`,
  `/dashboard/discover/asset/[symbol]`, `/dashboard/watchlist`,
  `/dashboard/trading/portfolio`, `/dashboard/wallet`.
- Admin page: `/admin/trading-control`.
- APIs: `/api/trading/markets`, `/api/trading/history`,
  `/api/trading/watchlist`, `/api/admin/trading`; admin API authorization tests.
- `supabase/migrations/00084_trading_stage_one.sql` and this document.

Modified: route constants, investor/admin navigation, contextual mobile navigation,
`.env.example`, `package.json` lint command and `eslint.config.mjs` (Next 16 native
flat configuration). No new dependencies. No existing financial service changed.

## Database and authorization

Migration 00084 creates `trading_settings`, `trading_asset_classes`,
`trading_instruments`, `trading_watchlist` and `trading_config_audit`.
It seeds 20 instruments as metadata only. Futures remain disabled. Database
constraints force simulated execution regardless of display mode.

RLS and grants deny anonymous access and customer configuration writes. Customers
can only modify their own watchlist (which has no financial effect). Administrator
API writes check an active authenticated administrator and same-origin request;
payloads are strict and cannot supply the audit actor. A service-role-only RPC
updates settings and inserts before/after audit data in one transaction. No API
accepts authoritative quotes, balances, orders, executions or settled P/L.

Migration is supplied but has NOT been applied to the hosted database. No local
Postgres/Docker runtime was available for a database integration test. Review and
test migration 00084 on staging using the established Supabase migration workflow
before production deployment. Do not reset the database. Inspect pending migration
history before `db push`; do not accidentally push unrelated pending migrations.
Regenerate database types using `npm run db:types` after installation. The new
repository uses a narrow, typed additive schema plus Zod runtime validation until
then. NUMERIC trade limits are requested as text to preserve decimal precision.

## Market data and configuration

No market provider credentials were present. `TRADING_MARKET_DATA_PROVIDER=none`
is the optional server-only default; no new API secret is required for this stage.
An unsupported provider name also fails closed. There is no live adapter, no
third-party browser request and no invented market price, chart or balance.

`MarketDataProvider` defines quotes, batched quotes, history and market status.
`MarketDataService` validates quote symbols, decimal values, spread and source
timestamps; rejects stale/future quotes; batches/deduplicates/caches requests;
backs off after rate limits; sanitizes network/provider failures. Quotes cache
for 15 seconds, unavailable results for 30 seconds; history caches for 60 seconds.
Visible clients refresh market data every 30 seconds, not in background tabs.
Quotes become stale after 60 seconds (future skew tolerance 5 seconds).

To connect real data, implement a licensed adapter at `services/trading/provider.ts`,
verify catalogue aliases/exchanges and coverage, load its secret only on the server,
and derive provider status from its actual configuration/health. An environment
variable alone intentionally cannot enable an unimplemented provider. The existing
deposit crypto helper is not reused. The list's 7D sparkline component accepts real
history; there is no populated list history while no adapter is connected.

## UI and admin behavior

Discover has search, shared category routes, featured selections, gainers/losers
derived only from fresh quotes, and a curated Popular Markets list explicitly
identified as catalogue selections rather than invented user activity.
Disabled classes disappear from customer navigation and API catalogue results.
An instrument's enabled/BUY/SELL flags control its available actions.

Asset pages share a chart with 1D/1W/1M/3M/1Y, overview/stats/position states,
watchlist actions, and a shared BUY/SELL ticket. Tickets are previews only; no
submit endpoint exists. Cash, opening costs and positions are marked unavailable
or not funded. Existing pool balances are never presented as trading cash.
SL/TP inputs are unsubmitted placeholders. Current prices and units are estimates,
not execution guarantees. Mobile cards, condensed lists and bottom-sheet ticket
styles are scoped to the new feature. Existing public pages are unchanged.

Admin controls persist display mode, global trading flag, class visibility,
instrument enabled/BUY/SELL/featured flags, positive minimum/maximum amounts and
display order. Execution status stays SIMULATED; enabling the trading flag does
not activate settlement in this stage. Existing pool navigation remains available.

## Validation and review limits

- Domain/provider tests cover canonical search, decimal units and long/short P/L,
  percentages, position/portfolio values, invalid inputs, quote normalization,
  stale/future quotes, closed markets, batch/cache/deduplication, unavailable
  configuration/network/rate limits, disabled classes/sides and environment locks.
- API tests reject anonymous/non-admin/cross-origin requests, forged audit actors
  and live execution changes; valid writes derive the actor from the session.
- Presentation tests prevent stale/current-price confusion and fictitious prices,
  verify disabled category navigation, and render honest disconnected-provider UI.
- Targeted lint passes for all new/modified source files. Repository-wide lint is
  now executable but reports 54 existing errors and 15 warnings outside this work.
- `npm run typecheck` and production build pass. Next reports the existing
  middleware-to-proxy deprecation; the original middleware is intentionally intact.
  Existing public landing-content reads also timed out during static generation
  and used their established defaults; production content availability was not
  certified by this build.
- All 196 tests across 36 files pass with `npm test -- --maxWorkers=2` when run
  without a competing build, including 34 newly added trading tests.
  Existing email/Telegram tests can exceed their 5-second timeout under build load.
- Actual localhost Discover redirects signed-out visitors to sign-in. Authenticated
  development catalogue routes and the 390px mobile layout were checked in-browser.
  This is not a substitute for integration testing against the installed migration
  and a real provider.
- Diff review confirms no edits to wallet, ledger, deposits, withdrawals, pool
  services or existing balance formulas. Pre-existing line-ending-only working
  changes in ROI calculator/login form and generated AGENTS/CLAUDE files were left.

## Stage 2 boundaries and risks

Deferred: transactional order execution, funded trading accounts, open/close
positions, realized/unrealized P/L persistence, SL/TP execution, trade history,
settlement/ledger integration and broker connectivity. No copy trading, futures,
margin, liquidation or leverage logic was introduced.

Before settlement: enforce immutable execution environments at the database level
on every order/position/execution (current contracts are readonly; no such rows
exist yet), define 12-place decimal truncation versus settlement rounding and
residual accounting, enforce instrument quantity precision and idempotency, define
short-side loss limits and actual broker instrument semantics, and atomically
reconcile orders → executions → positions → ledger events. Never reuse the current
preview estimate as an authoritative execution price.

The provider cache/quota protection is process-local. A multi-instance real adapter
must add shared quota enforcement, bounded network timeouts, entitlement checks and
verified market sessions. A licensed data source and migration deployment remain
prerequisites for live market prices and hosted administrator persistence. Missing
database configuration yields an unavailable/setup state in Supabase mode.

## Stage 1 review correction

The configured Supabase endpoint is hosted, not local. Read-only REST checks of
trading_settings, trading_asset_classes and trading_instruments returned HTTP 404
with PGRST205 (table absent from schema cache). The repository consequently returned
an empty unavailable catalogue. Missing provider credentials were not the cause.
Final navigation testing also exposed the shell returning a null profile: this
disabled the client catalogue query. Catalogue requests now proceed independently
of that optional shell profile, with active-user authorization retained in the API.

Migration 00084 has NOT been applied. Supabase status failed because Docker's engine
pipe was absent. No hosted schema, wallet or financial data was modified.

The explicit server-side development adapter uses
config/trading/development-catalogue.json and persists admin controls, local
watchlists and audit events in ignored .local/trading-stage1.json. It requires both
NODE_ENV=development and TRADING_CATALOGUE_SOURCE=development; the latter is set in
this workspace's ignored .env.local. Production cannot enable this adapter, and it
is never silently selected after a database error. Updates use an atomic rename
and a filesystem lock. All pages consume the same normalized repository/API data.

Configured symbols: BTCUSD, ETHUSD, SOLUSD, XRPUSD; EURUSD, GBPUSD, USDJPY, AUDUSD;
XAUUSD, XAGUSD, USOIL; AAPL, MSFT, NVDA, TSLA; SPX500, NAS100, DJ30; SPY, QQQ.
The unapplied SQL seed matches these 20 instruments. USDJPY prices are denominated
in JPY; USD ticket unit estimates remain unavailable without a USD conversion.

Discover now has six ordered categories, four featured overview cards, honest
unavailable movers and a representative list. The outer enclosing border is
removed. Category search covers the whole catalogue. Global search adds markets
and reuses existing published pool/manager listings, including their filters and
destinations. No copy trader placeholders or price fixtures are introduced.

Authenticated localhost checks verified Overview, all six categories, Gold/XAUUSD,
Bitcoin/BTC and Apple/AAPL searches, Gold details, both disabled BUY/SELL tickets,
global market/pool/manager results, an existing manager profile and pool detail,
Marketplace, Wallet and Pool Cycles. No financial action was submitted. Actual SQL
constraints/RLS integration and a connected-provider chart remain unverified.

### Manual local Supabase setup

Install and start Docker Desktop, then run from the repository:

```powershell
npx supabase start
npx supabase status
npx supabase migration list --local
npx supabase migration up --local
```

These commands target the local stack. Do not use linked production db push.
Review pending local migrations first. After success, inspect the five trading
tables, constraints and RLS with local database tooling. Generate types to a
temporary file so a failed generation cannot truncate the existing schema types:

```powershell
npx supabase gen types typescript --local | Out-File -Encoding utf8 .local/database.types.generated.ts
```

Check the command exit status and inspect the generated file before replacing
src/types/database.types.ts. Point the development environment at the local URL
and local keys from supabase status, set TRADING_CATALOGUE_SOURCE=supabase, and
restart development. Local auth needs its own test account. Provider can remain
none; licensed market-data integration is separate from catalogue availability.
