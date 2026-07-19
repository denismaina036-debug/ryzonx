# Platform Refinement Sprint

This document reflects the product simplification sprint: workflow and messaging refinements without redesigning layouts or removing backend architecture.

## Participants

1. **Investors** — discover pools, invest, track personal activity
2. **Pool Managers** — submit strategies, create pools, manage trading
3. **Administrators** — review and approve strategies and pools

## Landing Page

- Hero: *Where Great Traders Meet Smart Investors.*
- Communicates marketplace value for both traders and investors

## Dashboards

- Investor Dashboard remains available after PM approval
- Pool Manager Dashboard available in parallel
- Users switch via profile menu / sidebar links — neither dashboard is removed

## Marketplace

- Hero: *Choose the Right Investment Pool.*
- Stats: **Live Pools**, **Active Investors** only
- User-facing **Capital** terminology replaces **AUM** where displayed

## Activity

| Type | Purpose | Storage |
|------|---------|---------|
| **Personal Activity** | Deposits, withdrawals, investments, returns | `/dashboard/transactions` — permanent history |
| **Public Activity** | Live platform feed (new pool, investment, approval) | `/activity` — ephemeral feed from `platform_events` |

Public activity is never written to personal transaction history.

## Strategy Management

- **Application strategy** → auto-approved as first strategy on PM activation
- **Additional strategies** → PM submits; admin reviews (approve / reject / request changes)
- **Pool creation** → select one approved strategy; do not create strategies in pool form

## Pool Creation (Pool Manager)

Sections: Pool Information → Strategy (select) → Trading Session → Investment Rules → Schedule → Risk → **Return Structure** → Appearance

Pool Managers configure return tiers, branding, and all investment rules. Submit → Admin Review → Approve → **Cycle 1 auto-created** → Live in Marketplace.

See also: [13_POOL_CYCLE_OWNERSHIP.md](./13_POOL_CYCLE_OWNERSHIP.md)

## Admin Responsibilities

- Review strategies and pools — **do not create or configure pools**
- Assign initial PM rating, experience, verification, risk classification
- Performance engine updates ratings after trading begins

## Public Profile

- **Active Pools** tab replaces **Investment Cycles** in user-facing copy

## Architecture Preserved

All existing services remain: Strategy, Pool, Financial Engine, Performance Engine, Event System, Investment Cycles (internal).

Managed pools store extended config in `funds.pool_faq.managedPool`, link to approved `strategies`, and create `investment_cycles` on **pool approval** (not submit). Cycles reference `fund_id` and store immutable `pool_config_snapshot`.
