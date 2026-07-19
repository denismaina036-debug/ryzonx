# Profit Distribution Engine & Platform Revenue Model

RyvonX earns a **2.5% platform service fee** on **positive realized trading profits** only. The fee is never charged on deposits, withdrawals, capital, transfers, or losses.

## Official Settlement Sequence (mandatory)

```
1. Gross Trading Profit
        ↓
2. Deduct RyvonX Platform Service Fee (2.5%)
        ↓
3. Net Distributable Profit
        ↓
4. Calculate Pool Manager Share (Pool Profit Sharing Agreement)
        ↓
5. Remaining Profit → Investor Profit Pool
        ↓
6. Return Structure Distribution Engine → per-investor allocations
```

Investor profits are **never** distributed before the platform fee and pool manager share are calculated. The Return Structure distributes **only** the Investor Profit Pool.

## Pool Profit Sharing Agreement

Configured on each pool (`funds.investor_share_pct`, `funds.pool_manager_share_pct`). Must total 100%. Applied **after** the platform service fee.

Example: $20,000 gross → $500 fee → $19,500 net → 20% PM share ($3,900) → $15,600 investor profit pool → Return Structure distributes the pool.

## Return Structure Distribution Engine

**Single source of truth:** `src/lib/financial/return-structure-distribution.ts`

Configured on each pool via `funds.return_tiers` (managed pool form → Return Structure section).

| Input | Role |
|-------|------|
| Investment amount | Each investor's settled capital basis |
| Return multipliers | Matched tier `returnPct / 100` |
| Tier weighting | `allocationWeight = investmentAmount × returnMultiplier` |

When no return tiers are configured, the engine falls back to pro-rata distribution by investment amount (multiplier = 1.0).

## Services

| Service | Role |
|---------|------|
| `return-structure-distribution.ts` | **Investor profit allocation** — tier weighting, multipliers |
| `profit-distribution-calculator.ts` | Full settlement sequence orchestration |
| `profit-distribution.service.ts` | Central engine: calculate, confirm, distribute |
| `ledger.service.ts` | Double-entry postings (unchanged architecture) |
| `ledger-account.service.ts` | PM wallet, platform revenue, cycle profit payable accounts |

## Settlement Workflow

1. **Admin calculates** — `POST /api/admin/finance/profit-settlements/calculate` when cycle is in `distribution` or `completed`. Uses journal realized PnL + pool return structure.
2. **PM reviews** — settlement record status `pending_review` with full breakdown on cycle financial panel.
3. **PM confirms** — posts ledger: platform revenue credit, PM wallet credit, investor profit payable.
4. **PM distributes earnings** — transfers each investor's profit share to investor available wallet via `profit_distribution` ledger entries.

## Schema (migration `00035_profit_distribution.sql`)

- `profit_settlements` — immutable cycle settlement record (metadata stores return structure snapshot)
- `profit_settlement_allocations` — per-investor profit share (`ownership_pct` = share of investor profit pool)
- `platform_revenue_entries` — admin revenue analytics
- `funds.return_tiers` — pool Return Structure configuration

## Ledger Transaction Types Added

- `profit_settlement` — confirmation posting
- `platform_service_fee` — (reserved)
- `pool_manager_earnings` — (reserved)
- `profit_distribution` — investor wallet transfer

## UI

- **Pool Manager** — `/pool-manager/finance` dashboard; cycle financial panel with sequential breakdown + per-investor allocations
- **Investor** — profit distributions appear in financial timeline as "Investment Profit Distribution"
- **Administrator** — platform revenue summary on Financial Operations Center

## Auditability

Every settlement stores gross profit, fee, net, PM share, investor profit pool, return structure snapshot, ledger transaction IDs, and per-investor allocation transfers. Administrators can trace any completed cycle end-to-end.
