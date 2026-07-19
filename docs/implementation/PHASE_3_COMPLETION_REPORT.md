# Summary

Phase 3 introduces the **Core Investment Domain** alongside the existing `funds` model. Three new entities — **Strategy**, **Investment Cycle**, and **Investment Allocation** — are added with focused migrations, dedicated services, REST APIs, domain types, and lifecycle validation.

No existing tables were renamed or removed. No production data was migrated. Marketplace UI, investor dashboards, pool manager dashboards, wallet logic, and deposit/portfolio behaviour are unchanged.

All validation passed:

| Check | Result |
|-------|--------|
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm run build` | Pass — 154 routes compiled |

# Database Changes

Three new tables and six new enum types:

| Table | Purpose |
|-------|---------|
| `strategies` | Permanent Pool Manager investment methodologies |
| `investment_cycles` | Temporary fundraising/trading periods under a strategy |
| `investment_allocations` | Investor ↔ cycle commitment records |

**Relationships:**

```
pool_managers
    └── strategies (1:N)
            └── investment_cycles (1:N)
                    └── investment_allocations (1:N)
                            └── profiles (investor)
```

A trigger ensures `investment_cycles.pool_manager_id` always matches the owning strategy's Pool Manager.

# Migrations Created

| File | Contents |
|------|----------|
| `00024_strategies.sql` | `strategy_status`, `strategy_visibility`, `strategy_risk_profile` enums; `strategies` table |
| `00025_investment_cycles.sql` | `investment_cycle_status` enum; `investment_cycles` table with funding counters |
| `00026_investment_allocations.sql` | `investment_allocation_status` enum; `investment_allocations` table |
| `00027_investment_domain_rls.sql` | Ownership trigger, `get_approved_pool_manager_id()` helper, RLS policies, composite indexes |

# Services Added

| Service | Responsibility |
|---------|----------------|
| `strategy.service.ts` | CRUD, submit, admin/manager lifecycle transitions, audit logging |
| `investment-cycle.service.ts` | CRUD, submit, lifecycle transitions, public investor listing |
| `investment-allocation.service.ts` | Create/list allocations (model-only — no deposit wiring), admin status updates |

**Supporting modules:**

| Module | Purpose |
|--------|---------|
| `src/constants/strategy.ts` | Status, visibility, risk profile, transition maps |
| `src/constants/investment-cycle.ts` | Cycle statuses, lifecycle order, transition maps |
| `src/constants/investment-allocation.ts` | Allocation statuses |
| `src/domain/investment/types.ts` | Domain interfaces and input types |
| `src/lib/investment/strategy-lifecycle.ts` | Strategy transition validation |
| `src/lib/investment/cycle-lifecycle.ts` | Cycle transition validation |
| `src/lib/investment/utils.ts` | Slug and reference number helpers |

# APIs Added

### Pool Manager (`/api/pool-manager/`)

| Method | Route | Action |
|--------|-------|--------|
| GET/POST | `strategies` | List / create strategies |
| GET/PATCH | `strategies/[id]` | View / update draft strategy |
| POST | `strategies/[id]/submit` | Submit for review |
| GET/POST | `investment-cycles` | List / create cycles |
| GET/PATCH | `investment-cycles/[id]` | View / update draft cycle |
| POST | `investment-cycles/[id]/submit` | Submit cycle for review |
| GET | `investment-cycles/[id]/allocations` | List allocations for owned cycle |

### Administrator (`/api/admin/`)

| Method | Route | Action |
|--------|-------|--------|
| GET | `strategies` | List all strategies |
| GET | `strategies/[id]` | View strategy |
| POST | `strategies/[id]/transition` | Admin lifecycle transition |
| GET | `investment-cycles` | List all cycles |
| GET | `investment-cycles/[id]` | View cycle |
| POST | `investment-cycles/[id]/transition` | Admin lifecycle transition |
| GET | `investment-allocations` | List allocations (filterable) |
| PATCH | `investment-allocations/[id]` | Update allocation status |

### Investor (`/api/investor/`)

| Method | Route | Action |
|--------|-------|--------|
| GET/POST | `investment-allocations` | List own / create pending allocation |
| GET | `investment-cycles` | List public cycles (read-only) |

No UI pages were added — APIs only, per phase scope.

# Types Updated

- `src/types/database.types.ts` — added `strategies`, `investment_cycles`, `investment_allocations` table types; five new enums; `get_approved_pool_manager_id` function signature
- `src/domain/investment/` — domain models decoupled from Supabase row shapes

# Compatibility Notes

- **`funds` table unchanged** — existing pools, marketplace, and investor portfolio flows continue to use `funds` / `investor_portfolios`.
- **No deposit integration** — `investment_allocations.create()` records a pending allocation and updates cycle counters only; wallets, transactions, and `investor_portfolios` are not modified.
- **No trading/distribution engines** — cycle transitions are administrative state changes only.
- **Backward-compatible APIs** — all existing `/api/*` routes untouched; new routes are additive under `/api/pool-manager/`, `/api/admin/`, and `/api/investor/`.
- **RLS enforced at database level** — services use admin client after server-side auth checks, consistent with existing pool manager services.

# Validation Results

```
npm run lint      ✔ No ESLint warnings or errors
npm run typecheck ✔ database.types.ts OK; tsc --noEmit clean
npm run build     ✔ Compiled successfully; 154 routes generated
```

# Remaining Work

Deferred to later phases:

1. **Marketplace UI** — wire manager profiles to Strategy / Cycle entities instead of pool cards
2. **Deposit integration** — connect allocations to wallet debits and transaction records
3. **Portfolio behaviour** — migrate investor holdings from `investor_portfolios` to cycle allocations
4. **Trading engine** — journal and trade recording per cycle
5. **Distribution engine** — profit distribution after cycle completion
6. **Dynamic ratings** — cycle performance impact on manager ratings
7. **Investor reviews** — post-cycle review workflow
8. **Notifications** — lifecycle event triggers (funding opened, trading started, etc.)
9. **Admin UI** — strategy/cycle review dashboards
10. **Pool Manager UI** — strategy and cycle management screens
11. **Granular cycle states** — architecture doc includes intermediate states (e.g. `fully_funded`, `administrative_review`); simplified 8-state model used in Phase 3

# Ready For Phase 4

Phase 3 is complete and ready for approval. The Core Investment Domain is established in the database and accessible via typed services and REST APIs without disrupting the live platform.

**Recommended Phase 4 focus:** Pool Manager platform UI for strategy/cycle management, admin review workflows, and begin linking Marketplace presentation to the new domain.

**Stop.** Do not begin Phase 4 until approved.
