# Summary

Phase 6 delivers the complete **Investor Investment Experience** for RyvonX. Investors can now discover Pool Managers, Strategies, and Investment Cycles through an enhanced marketplace, review professional detail pages, commit to funding cycles via the allocation service, track commitments in a unified portfolio, and operate from a redesigned investor home dashboard — all without modifying wallet, deposit, or transaction logic.

All validation passed:

| Check | Result |
|-------|--------|
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm run build` | Pass — 167 routes compiled |

# Investor Experience Features

## Investor Home (`/dashboard`)
- **Investment Overview** panel answering "What should I invest in today?"
- Recommended funding cycles, featured managers, recently approved strategies
- Portfolio summary: wallet balance, cycle commitments, pending allocations
- Investment Insights placeholder (awaiting Trading Engine)
- Legacy dashboard preserved: wallet hero, pool performance, trades, activity, challenge

## Portfolio (`/dashboard/portfolio`)
- Pending allocations with cancel action (during funding)
- Active cycle commitments with status labels
- Strategy exposure and risk allocation breakdowns
- Investment timeline (allocations + legacy pools)
- Legacy pool holdings with profit actions preserved

## Allocation Flow
- Commit page at `/marketplace/cycles/[slug]/commit` (auth required, funding status only)
- Creates **pending** allocation via `investmentAllocationService.create()`
- Confirmation screen with reference number
- Cancel via `investmentAllocationService.cancelMine()` — pending only, funding cycles only
- No wallet debits or deposit wiring

## Navigation (updated)
Home · Marketplace · Portfolio · Managers · Activity · Notifications · Settings

Legacy links (My Investments, Transactions, Support) remain accessible.

# Marketplace Enhancements

## Hierarchy: Managers → Strategies → Cycles → Invest
New marketplace tabs alongside legacy pools:
- **Pool Managers** — existing manager-first browse
- **Strategies** — public approved strategies with risk filter
- **Investment Cycles** — funding progress, risk profile, funding status filters
- **Legacy Pools** — original `funds`-based cards preserved

## Search & Filtering
- Text search across managers, strategies, cycles, and legacy pools
- Risk profile filter (strategies and cycles)
- Funding status filter (cycles: actively funding / open for commitment)
- Legacy pool filters preserved (category, security, aggressiveness, capacity)

# Pages Added

| Route | Purpose |
|-------|---------|
| `/marketplace/strategies/[slug]` | Strategy detail — objectives, risk, cycles, FAQ |
| `/marketplace/cycles/[slug]` | Investment opportunity — funding progress, timeline, disclaimers |
| `/marketplace/cycles/[slug]/commit` | Allocation commitment flow |
| `/dashboard/portfolio` | Unified portfolio (cycles + legacy) |

**Updated:**
- `/dashboard` — investment home panel
- `/marketplace` — strategies/cycles tabs and cards
- `/managers/[slug]` — strategies, cycles, achievements, performance placeholder, reviews placeholder
- `/dashboard/investments` — link to cycle portfolio

# Components Added

| Component | Purpose |
|-----------|---------|
| `investor-home-investment-panel.tsx` | Dashboard investment discovery section |
| `investor-portfolio-view.tsx` | Portfolio with allocations, exposure, timeline |
| `allocation-commit-client.tsx` | Commit + confirmation UI |
| `investor-allocation-api.ts` | Client helpers for create/cancel |
| `investment-marketplace-cards.tsx` | Strategy and cycle browse cards |
| `strategy-detail-view.tsx` | Strategy detail page |
| `cycle-opportunity-view.tsx` | Cycle opportunity page |

# Services Reused

| Service | Usage |
|---------|-------|
| `strategy.service.ts` | Extended: `listPublic()`, `getPublicBySlug()` |
| `investment-cycle.service.ts` | Extended: `listPublic()`, `getPublicBySlug()` |
| `investment-allocation.service.ts` | Extended: `cancelMine()` for investor cancel |
| `investor-investment.service.ts` | **New** — home data, portfolio, card enrichment |
| `marketplace-presentation.service.ts` | Extended: strategies/cycles on landing, strategy/cycle/manager page data |
| `marketplace.service.ts` | Legacy pools and managers (unchanged) |
| `investor.service.ts` | Legacy dashboard data (unchanged) |
| `wallet.service.ts` | Legacy wallet summary (unchanged) |
| `pool-manager-dashboard.service.ts` | Public manager profiles (unchanged) |

# APIs Integrated

| Endpoint | Purpose |
|----------|---------|
| `GET /api/investor/investment-cycles` | List public cycles (existing) |
| `GET /api/investor/investment-allocations` | List investor allocations (existing) |
| `POST /api/investor/investment-allocations` | Create pending allocation (wired to UI) |
| `POST /api/investor/investment-allocations/[id]/cancel` | **New** — cancel pending allocation |

Server-rendered pages call services directly for browse/detail (no new public API routes required).

# Validation Results

```
npm run lint      ✔ Pass
npm run typecheck ✔ database.types.ts OK; tsc --noEmit clean
npm run build     ✔ Compiled successfully; 167 routes generated
```

# Known Limitations

1. **Wallet/deposit integration deferred** — Allocations are model-only records. No wallet debits, deposit requirements, or `investor_portfolios` linkage.
2. **Placeholder analytics** — Investment Insights, historical performance on manager profiles, and cycle ROI are placeholders until Trading Engine data exists.
3. **Dynamic Ratings dependencies** — Ratings displayed on manager/strategy pages are static/display-only placeholders, not computed by the Dynamic Ratings Engine.
4. **Distribution Engine dependencies** — No distribution status UI or payout tracking; allocation statuses beyond `pending` are not investor-actionable yet.
5. **Trading Engine dependencies** — No cycle-linked trading journal, live performance, or progress monitoring during trading/distribution phases.
6. **Reviews placeholder** — Manager profile reviews tab is deferred.
7. **Legacy coexistence** — Pool join flow (`/marketplace/[slug]/join`) and legacy portfolio via `investor_portfolios` remain fully functional alongside cycle allocations.
8. **Cancel scope** — Investors may cancel only **pending** allocations while cycle is in **funding**; confirmed/locked allocations require admin action.
9. **Public browse without auth** — Marketplace browse works for guests; commit requires authentication.

# UX Principles Applied

| Page | Question answered |
|------|-------------------|
| Home | "What should I invest in today?" |
| Manager profile | "Can I trust this manager?" |
| Strategy detail | "How do they invest?" |
| Cycle opportunity | "Should I join this opportunity?" |
| Portfolio | "How is my money positioned?" |

Design reuses existing investor design tokens (`--id-*`), `InvestorPageContent`, marketplace breadcrumbs, and PM workspace funding/lifecycle components for consistency.

# Ready For Phase 7

Phase 6 is complete and ready for approval. Investors have a full discovery-to-commitment experience for the Core Investment Domain while legacy pool participation continues to work.

**Recommended Phase 7 focus:** Trading Engine integration, Dynamic Ratings display, wallet/deposit linkage for allocations, Distribution Engine, and cycle-linked performance analytics.

**Stop.** Do not begin Phase 7 until approved.
