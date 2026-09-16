# Simulation tradability milestone

## Current state and runtime boundary

Implemented Twelve Data integration and permanent PostgreSQL simulation execution.
The browser milestone is **not yet financially verified**: this workspace points
to hosted Supabase, no local Docker engine is running, and migrations 00084/00085
have not been applied. No hosted schema changes or real wallet transactions were
performed. The metadata development store never stores accounts, orders or money.

Actual read-only Twelve Data checks on 2026-09-10 returned Gold, Bitcoin, EUR/USD
and Apple responses. Gold, Bitcoin and EUR/USD had current last_quote_at values.
Apple was closed with an old quote and is correctly non-executable. Gold's actual
quote and historical chart were also verified in the authenticated local browser.
Provider prices change; diagnostic examples are not runtime fixtures.

## Market data

- Server-only TWELVE_DATA_API_KEY and TRADING_MARKET_DATA_PROVIDER=twelve_data.
- Adapter: src/services/trading/twelve-data.ts. Native Node HTTPS transport avoids
  Next fetch URL instrumentation. Credentials, URLs and raw upstream errors are
  never returned or logged. Diagnostic scripts only print allow-listed fields.
- `/quote?interval=1day` supplies daily change; last_quote_at supplies freshness.
  The candle-start timestamp is not substituted with local receipt time. Missing
  last_quote_at falls back to provider timestamp and usually fails freshness.
- Freshness limit 60 seconds, future skew 5 seconds. Unknown/closed market, stale,
  invalid, unavailable or rate-limited quotes cannot execute. No fake spread.
- BUY uses ask and SELL bid when supplied, otherwise provider last price. Closing
  uses the opposite side. Quote source, timestamp and price basis are persisted.
- Canonical mappings verified by actual quotes: XAUUSD→XAU/USD, BTCUSD→BTC/USD,
  EURUSD→EUR/USD, AAPL→AAPL. Provider catalogue also confirmed ETH/USD, SOL/USD,
  XRP/USD, GBP/USD, AUD/USD, USD/JPY, XAG/USD, SPY and QQQ. MSFT/NVDA/TSLA use their
  canonical tickers with response-symbol validation; their catalogue request timed
  out, so account-specific quote access remains to verify.
- USOIL/SPX500/NAS100/DJ30 deliberately have no enabled provider alias. They remain
  visible metadata with unavailable quotes. Do not substitute a different product.
- USDJPY can be browsed but cannot execute until a separately verified USD
  conversion model is implemented; dividing USD funds by JPY quotes would be wrong.
- Quote cache 15 seconds, unavailable cache 30 seconds, history 60 seconds. In-flight
  symbol deduplication includes overlapping batches. Process-global provider/cache
  shares credits across routes. UI polling is 30 seconds while visible.
- TWELVE_DATA_CREDITS_PER_MINUTE defaults conservatively to 8. Set it to the actual
  subscribed allowance. Each symbol costs credits even within a batch. Provider
  429 causes cooldown. Multiple deployed processes still need shared quota
  coordination; current limiter is per process, with upstream limits failing closed.

References: [provider requests](https://support.twelvedata.com/en/articles/5620512-how-to-create-a-request),
[batch credits](https://support.twelvedata.com/en/articles/5203360-batch-api-requests),
[symbol catalogues](https://support.twelvedata.com/en/articles/5620513-how-to-find-all-available-symbols-at-twelve-data).

## Permanent simulation architecture

Migration 00085 extends trading controls and creates simulation_accounts,
simulation_positions and simulation_events. Existing ledger account codes and
wallet projections have no environment dimension and represent withdrawable money;
reusing those accounts would contaminate real balances. Dedicated simulation tables
are an explicit isolated accounting domain, not a second real funding wallet.

Accounts are SIMULATED/USD, with a one-time admin-default starting credit (5000 by
default). Creating an account is explicit, authenticated POST. Changing defaults
never resets existing cash. No reset feature is included. Every account, position
and immutable journal record has a constrained SIMULATED environment and USD currency.

Opening/closing is a service-role-only transaction RPC. An account row lock
serializes mutations; the transaction validates active owner, configuration,
instrument, amount, cash and trusted quote. Position creation, cash movement and
idempotency receipt commit together. Per-user request keys prevent duplicate opens;
closed positions cannot be paid twice. Portfolio snapshots read cash/positions in
one database statement. No account creation or settlement occurs on GET.

The ExecutionRouter selects SimulationExecutionProvider. The provider delegates
to atomic RPCs; a future broker adapter has a separate interface and cannot be
selected by display mode. Browser payloads accept only instrument, side, amount,
optional SL/TP and idempotency key; close accepts position and key. All prices,
units, ownership, environment and P/L are server/database determined.

NUMERIC(30,12) stores money and units. Units truncate to instrument quantity
precision. The residual from truncation remains in the invested allocation and is
returned on close, rather than silently disappearing. P/L truncates toward zero at
12 decimals. Shared BigInt presentation calculations mirror database arithmetic.
Cash is reserved in full at open. Position value = invested + P/L. Both directions
cap losses at invested amount; this is a deliberately limited-loss simulation,
not a claim about real short-selling mechanics. Cash never becomes negative.

Portfolio value = cash + open position values. If any mark is unavailable, totals
that depend on it are unavailable; stale marks are never shown as live values.
Daily position P/L is omitted because a reliable position-day basis is not stored.
Closed history records price, time, reason, source and realized P/L. Current marks
are computed from live quotes rather than repeatedly writing non-authoritative
prices into the position record. Manual closing remains possible when opening is
disabled, so disabling new trading does not trap existing positions.

## Protection worker

SL/TP conditions use the same authoritative close RPC and audit MANUAL, STOP_LOSS
or TAKE_PROFIT. Controls are checked again in the transaction. User-visible Portfolio
checks every 30 seconds while open. Configure a separate scheduler to GET
`/api/trading/simulation/reconcile` every minute using
`Authorization: Bearer <TRADING_WORKER_SECRET>` for offline protection.

This is periodic protection, not guaranteed tick execution: gaps, stale data,
closed markets, outages and credit limits delay exits. Actual fill uses the next
valid executable quote, not the threshold. No alternate settlement path exists.
The worker handles 100 protected positions per run with a durable round-robin
database cursor, so later positions are not permanently excluded. Size the worker
schedule and data plan to cover all protected positions at the required cadence.
Do not enable SL/TP for unattended production use before the worker is scheduled
and its capacity/quote coverage has been checked. No scheduler was deployed here.

## Admin/security

Trading Control Center includes global trading, simulation, BUY, SELL, SL, TP,
default starting balance, class visibility and per-instrument listing/trading/side
controls with min/max. Display mode cannot switch execution environment. Provider
status reports actual recent quote success, errors and timestamp, never the key.
Changes retain existing role checks and transactional audit records.

RLS permits only own-account/own-position/own-history reads. Browser roles have no
write privileges or execution RPC grants. All mutating HTTP routes validate active
authentication and same origin. Triggers prevent opening-execution/environment
rewrites and journal edits/deletes. Real wallet, deposit, withdrawal, distribution
and pool services were not changed.

## Verification

Embedded PostgreSQL (PGlite) runs the actual 00084 and 00085 SQL against isolated
test profiles/auth roles. Covers golden BUY 5000→4000→5080, losing BUY, profitable
SELL, capped short loss, idempotent retries, concurrent request attempts, double
close, insufficient funds, stale/closed/mismatched quotes, controls, protection,
owner isolation, RLS privileges, immutable records and unchanged existing starting
balances. This verifies SQL, not a deployed Supabase installation. Full multi-
connection stress testing remains necessary on local/staging PostgreSQL.

Provider tests cover mapping, freshness, absent bid/ask, batching/budget, unsupported
symbols and sanitized error cases. HTTP tests reject anonymous/inactive/cross-origin
requests and forged prices, P/L, balances, units, users and environments.

Actual browser checks: real Gold quote/chart, BUY ticket, and Portfolio's honest
database-unavailable state. Open/close desktop/mobile financial flow remains blocked
by missing migrations. Do not report the visual financial milestone complete yet.

## Exact remaining local setup

1. Install/start Docker Desktop. From this repository run:

```powershell
npx supabase start
npx supabase status
npx supabase migration list --local
npx supabase migration up --local
```

2. Configure .env.local with the **local** URL/anon key/service key from status,
   `TRADING_CATALOGUE_SOURCE=supabase`, and the existing Twelve Data credentials.
   Restart `npm run dev`. Create local test investor/admin accounts. Do not point
   local commands or credentials at production. Staging requires its own explicit
   project configuration and reviewed pending migrations.
3. Generate types safely to a temporary file, check exit status and contents before
   replacing src/types/database.types.ts:

```powershell
npx supabase gen types typescript --local | Out-File -Encoding utf8 .local/database.types.generated.ts
```

4. In `/admin/trading-control`, enable Trading and Simulation, review sides/limits
   and starting cash. Ensure Gold is enabled. Configure the actual provider credit
   allowance. If enabling SL/TP, configure/test the scheduled protection endpoint.
5. In `/dashboard/trading/portfolio`, create the simulation account. Review
   `/dashboard/discover/asset/XAUUSD`, enter 1000 in BUY, open, verify portfolio
   marks, close and verify cash/history. Repeat losing/SELL cases on staging with
   controlled test quotes in automated tests only, never fabricated production data.

No production migration, deployment, real broker, leverage, copy trading or real
financial mutation is included. Stop for visual and financial review after setup.
