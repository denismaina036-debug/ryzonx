# Investment Cycle & Pool Ownership Refinement

This refinement makes **Pools** the primary investment product and **Investment Cycles** funding rounds that belong to a Pool. It preserves existing services and UI patterns — no layout redesign.

## Hierarchy

```
Pool Manager
  → Approved Strategy
    → Pool (master configuration)
      → Investment Cycle (funding round)
        → Investor Participation
```

## Pool Manager Ownership

Pool Managers configure the full pool in one creation flow:

- Pool information, branding, theme, cover, visibility
- Approved strategy selection (no embedded strategy creation)
- Trading description (methodology, sessions, hours, timeframes, trade frequency, manager notes)
- Investment rules (min/max investment, capacity, investors, funding)
- Risk configuration
- **Return by investment amount** (`funds.return_tiers`) — moved from admin-only editor
- Card background color (`funds.card_background_color`)

Administrators **review and approve** pools; they do not design or configure them.

## Investment Cycles

| Rule | Behavior |
|------|----------|
| Creation on approve | Cycle 1 is created when admin approves a pool and sets it live |
| Inheritance | Each cycle inherits the latest approved pool configuration |
| PM cycle fields | Optional name, opening date, closing date only |
| Future cycles | PM creates when prior cycle is **completed** or **full** |
| Immutability | `pool_config_snapshot` + `pool_version` on each cycle row |

### Schema (migration `00034_pool_cycle_ownership.sql`)

- `funds.pool_config_version` — increments when pool config changes
- `investment_cycles.fund_id` — parent pool
- `investment_cycles.cycle_number` — sequential index within pool
- `investment_cycles.pool_version` — snapshot version reference
- `investment_cycles.pool_config_snapshot` — JSONB immutable config at creation
- `investment_cycles.opening_date` / `closing_date` — cycle timeline

## Investor Experience

- Browse **Pools** in the marketplace
- Pool detail shows **Current Investment Cycle** and **Participate** when status is `funding`
- Empty state: *No investment cycle is currently accepting new participants.*
- Standalone `/marketplace/cycles/[slug]` routes redirect to the parent pool

## Services

| Service | Role |
|---------|------|
| `managed-pool.service` | PM pool CRUD, submit for review, cycle list/create |
| `investment-cycle.service` | `createFromPool`, `getActiveForFund`, `createFirstCycleForApprovedPool` |
| `pool-config-snapshot.ts` | Builds immutable snapshot from `funds` row |
| `marketplace.service` | Pool detail includes `activeCycle`, `returnTiers`, `canParticipate` |

## Workflow Changes

1. **Submit pool** — validates config + strategy; no cycle created
2. **Approve pool** — strategy approved; Cycle 1 created with pool snapshot; pool goes live in `funding`
3. **Later cycles** — PM opens from pool edit page; inherits current pool config version

## Documentation Updated

- `docs/architecture/06_INVESTMENT_CYCLES.md` — pool-owned cycles
- `docs/architecture/12_PLATFORM_REFINEMENT.md` — cross-reference
- `docs/architecture/03_POOL_MANAGER_ARCHITECTURE.md` — PM-owned return tiers
