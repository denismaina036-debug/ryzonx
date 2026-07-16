# Ryvonx Naming Conventions

Quick reference for consistent naming across the codebase.

## Files

```
ComponentName     → metric-card.tsx        (kebab-case file, PascalCase export)
Hook              → use-pool.ts            (use- prefix)
Service           → pool.service.ts        (.service suffix)
Layout            → dashboard-layout.tsx   (-layout suffix)
Validation        → auth.ts                (in lib/validations/)
Constant          → routes.ts              (plural noun)
Type definition   → index.ts               (in types/ or feature/types/)
Migration         → 00001_initial_schema.sql (numbered prefix)
```

## Code Identifiers

```typescript
// Components
export function MetricCard() {}

// Hooks
export function usePoolStats() {}

// Services
export const poolService = { async getStats() {} };

// Constants
export const USER_ROLES = { INVESTOR: "investor" } as const;
export const QUERY_KEYS = { pool: { stats: ["pool", "stats"] } };

// Types
export interface PoolStats {}
export type TransactionStatus = "pending" | "approved";

// DB → App mapping
total_pool_value  →  totalPoolValue
full_name         →  fullName
is_active         →  isActive
```

## Route Organization

```
src/app/
  (public)/          ← Route group (no URL segment)
    page.tsx         ← /
    about/
      page.tsx       ← /about
  (dashboard)/
    dashboard/
      page.tsx       ← /dashboard
      portfolio/
        page.tsx     ← /dashboard/portfolio
  (admin)/
    admin/
      page.tsx       ← /admin
```

## Feature Module

```
src/features/pool/
  components/        ← Pool-specific UI (e.g., StatsGrid)
  hooks/             ← Pool-specific hooks (e.g., usePoolStats)
  services/          ← Pool data access (e.g., pool.service.ts)
  types/             ← Pool-specific types
  index.ts           ← Barrel: export * from "./hooks", etc.
```

## Query Keys

```typescript
// Hierarchical, consistent
["pool", "stats"]
["pool", "performance", "daily"]
["investor", "portfolio"]
["admin", "deposits", { status: "pending" }]
```

## Git Conventions

```
feat: add deposit request form
fix: correct ownership percentage calculation
refactor: extract pool stats service
docs: update architecture diagram
chore: upgrade dependencies
```
