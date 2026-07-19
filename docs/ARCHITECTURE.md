# Ryvonx Architecture

> **Note:** This is a legacy foundation document. For authoritative platform specifications, see [docs/README.md](./README.md) and [architecture/](./architecture/).

> Production-ready foundation for a transparent pool trading fund management platform.

## Overview

Ryvonx is a **Pool Trading Fund Management Platform** — not a broker, copy trading platform, or exchange. Investors participate in a professionally managed trading pool with full transparency into fund performance, trades, and activity.

This document describes the architecture decisions, folder structure, routing, authentication, database design, and conventions established in the foundation phase.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui (customized) |
| Backend | Supabase (PostgreSQL, Auth, Storage, RLS) |
| State | TanStack React Query |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Icons | Lucide React |
| Notifications | Sonner |
| Animations | Framer Motion |
| Deployment | Vercel |

---

## Folder Structure

```
ryvonx/
├── docs/                          # Architecture & convention docs
├── public/                        # Static assets
├── supabase/
│   └── migrations/                # SQL schema migrations
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (public)/              # Public pages (no auth required)
│   │   ├── (auth)/                # Login, register, password reset
│   │   ├── (dashboard)/           # Investor portal (protected)
│   │   ├── (admin)/               # Admin console (protected)
│   │   └── auth/callback/         # Supabase auth callback
│   ├── components/
│   │   ├── ui/                    # Design system primitives
│   │   └── layouts/               # Layout shells (public, dashboard, admin)
│   ├── constants/                 # App-wide constants (routes, roles, tokens)
│   ├── features/                  # Feature modules (by domain)
│   │   ├── auth/
│   │   ├── pool/
│   │   ├── investor/
│   │   ├── admin/
│   │   └── notifications/
│   ├── hooks/                     # Shared React hooks
│   ├── lib/                       # Core utilities & clients
│   │   ├── auth/
│   │   ├── supabase/
│   │   └── validations/
│   ├── providers/                 # React context providers
│   ├── services/                  # Data access layer (Supabase queries)
│   ├── store/                     # Client state (future Zustand if needed)
│   ├── styles/                    # Global CSS & design tokens
│   ├── types/                     # TypeScript type definitions
│   └── utils/                     # Pure utility functions
├── .env.example
├── components.json                # shadcn/ui config
├── next.config.ts
├── package.json
└── tsconfig.json
```

### Feature Module Convention

Each feature in `src/features/` follows this structure:

```
features/{feature-name}/
├── components/     # Feature-specific UI components
├── hooks/          # Feature-specific hooks
├── services/       # Feature-specific data operations
├── types/          # Feature-specific types
├── utils/          # Feature-specific utilities
└── index.ts        # Public API barrel export
```

---

## Application Routing

### Route Groups

Next.js route groups organize layouts without affecting URLs:

| Group | Path Prefix | Layout | Auth Required | Role |
|-------|------------|--------|---------------|------|
| `(public)` | `/` | PublicLayout | No | — |
| `(auth)` | `/login`, `/register`, etc. | AuthLayout | No | — |
| `(dashboard)` | `/dashboard/*` | DashboardLayout | Yes | investor+ |
| `(admin)` | `/admin/*` | AdminLayout | Yes | administrator |

### Full Route Map

#### Public Routes (Visitor)
| Route | Purpose |
|-------|---------|
| `/` | Landing page with fund overview |
| `/about` | About Ryvonx |
| `/performance` | Fund performance history & charts |
| `/journal` | Public trading journal |
| `/transparency` | Deposits, withdrawals, fund stats |
| `/faq` | Frequently asked questions |

#### Auth Routes
| Route | Purpose |
|-------|---------|
| `/login` | Sign in |
| `/register` | Create account |
| `/forgot-password` | Request password reset |
| `/reset-password` | Set new password |
| `/verify-email` | Email verification notice |
| `/auth/callback` | Supabase auth callback (API route) |

#### Investor Routes (Protected)
| Route | Purpose |
|-------|---------|
| `/dashboard` | Portfolio overview |
| `/dashboard/portfolio` | Ownership & ROI details |
| `/dashboard/deposits` | Request & track deposits |
| `/dashboard/withdrawals` | Request & track withdrawals |
| `/dashboard/transactions` | Transaction history |
| `/dashboard/statements` | Download statements |
| `/dashboard/notifications` | Notification center |
| `/dashboard/settings` | Account settings |

#### Admin Routes (Protected)
| Route | Purpose |
|-------|---------|
| `/admin` | Admin dashboard overview |
| `/admin/trades` | Publish & manage trades |
| `/admin/pool` | Update pool value & ROI |
| `/admin/deposits` | Approve/reject deposits |
| `/admin/withdrawals` | Approve/reject withdrawals |
| `/admin/investors` | Manage investors |
| `/admin/announcements` | Publish announcements |
| `/admin/reports` | Generate reports |
| `/admin/settings` | Platform settings |

---

## Authentication Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Visitor    │────▶│  Register /   │────▶│  Supabase   │
│  (browse)    │     │   Login      │     │    Auth     │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                 │
                                    ┌────────────▼────────────┐
                                    │  Trigger: create profile │
                                    │  role = 'investor'     │
                                    └────────────┬────────────┘
                                                 │
                          ┌──────────────────────┼──────────────────────┐
                          │                      │                      │
                   ┌──────▼──────┐      ┌───────▼───────┐     ┌───────▼───────┐
                   │  Investor    │      │  Middleware    │     │ Administrator │
                   │  Dashboard   │      │  (session +    │     │  Console      │
                   │              │      │   role check)  │     │               │
                   └─────────────┘      └───────────────┘     └───────────────┘
```

### Auth Layers (Defense in Depth)

1. **Supabase Auth** — Email/password authentication with email verification
2. **Middleware** (`src/middleware.ts`) — Session refresh, route protection, role redirects
3. **Server-side guards** (`requireAuth`, `requireRole`) — Server Components & Actions
4. **RLS Policies** — Database-level access control
5. **Client context** (`AuthProvider`) — UI-level role awareness

### Session Management

- Cookies managed by `@supabase/ssr`
- Middleware refreshes session on every request
- Server Components read session via `createClient()` (server)
- Client Components use `createClient()` (browser)

---

## User Role Strategy

### Role Hierarchy

```
visitor (0) < investor (1) < administrator (2)
```

### Role Assignment

| Event | Role Assigned |
|-------|--------------|
| Unauthenticated browsing | visitor (implicit) |
| New registration | investor (via DB trigger) |
| Manual promotion | administrator (admin action) |

### Permission Model

- **Route-level**: Middleware checks role against route prefix
- **Feature-level**: `hasPermission(role, permission)` for fine-grained checks
- **Data-level**: Supabase RLS policies enforce row access

See `src/constants/roles.ts` for the full permissions matrix.

---

## Database Architecture

### Entity Relationship Overview

```
profiles ─────────┬──── investor_portfolios
                  ├──── transactions
                  ├──── notifications
                  └──── audit_logs (as actor)

pool_stats (singleton)
performance_snapshots
trades ──────────── journal_entries
announcements
faq_items
platform_settings
```

### Key Design Decisions

1. **Singleton pool_stats** — One row updated by admin; supports future multi-pool via migration
2. **Proportional ownership** — `investor_portfolios.ownership_percentage` recalculated on deposits/withdrawals
3. **Manual approval workflow** — Deposits/withdrawals require admin approval (status: pending → approved → completed)
4. **Audit-ready** — `audit_logs` table prepared for future compliance requirements
5. **Config store** — `platform_settings` key-value JSONB for runtime configuration
6. **Public transparency** — RLS allows unauthenticated SELECT on pool stats, performance, closed trades, journal

### Migration

Apply the initial schema:

```bash
# Via Supabase CLI
supabase db push

# Or paste supabase/migrations/00001_initial_schema.sql into Supabase SQL Editor
```

Generate TypeScript types after applying:

```bash
npm run db:types
```

---

## Naming Conventions

### Files & Folders

| Type | Convention | Example |
|------|-----------|---------|
| Components | `kebab-case.tsx` | `metric-card.tsx` |
| Hooks | `use-{name}.ts` | `use-pool.ts` |
| Services | `{domain}.service.ts` | `pool.service.ts` |
| Types | `{domain}.types.ts` or `index.ts` | `types/index.ts` |
| Constants | `{name}.ts` | `routes.ts`, `roles.ts` |
| Validations | `{domain}.ts` in `lib/validations/` | `auth.ts` |
| Layouts | `{name}-layout.tsx` | `dashboard-layout.tsx` |
| Route groups | `(group-name)/` | `(public)/`, `(admin)/` |

### Code

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `MetricCard` |
| Hooks | camelCase with `use` prefix | `usePoolStats` |
| Constants | SCREAMING_SNAKE_CASE | `USER_ROLES`, `QUERY_KEYS` |
| Types/Interfaces | PascalCase | `PoolStats`, `UserProfile` |
| Enums (DB) | snake_case | `user_role`, `transaction_status` |
| DB columns | snake_case | `total_pool_value` |
| App types | camelCase | `totalPoolValue` |
| Service methods | camelCase verbs | `getStats()`, `getPerformanceHistory()` |
| Query keys | nested arrays | `['pool', 'stats']` |

### Mapping Pattern

Database snake_case → Application camelCase via service layer mappers:

```typescript
// services/pool.service.ts
return {
  totalPoolValue: data.total_pool_value,
  totalActiveInvestors: data.total_active_investors,
  // ...
};
```

---

## Environment Variables

| Variable | Required | Scope | Description |
|----------|----------|-------|-------------|
| `NEXT_PUBLIC_APP_URL` | Yes | Client | Application URL (`https://ryvonx.com` in production) |
| `NEXT_PUBLIC_APP_NAME` | Yes | Client | Display name |
| `NEXT_PUBLIC_APP_ENV` | Yes | Client | `development` / `staging` / `production` |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Client | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server | Service role key (bypasses RLS) |
| `NEXT_PUBLIC_ENABLE_REGISTRATION` | No | Client | Feature flag (default: true) |
| `NEXT_PUBLIC_ENABLE_DEPOSITS` | No | Client | Feature flag (default: true) |
| `NEXT_PUBLIC_ENABLE_WITHDRAWALS` | No | Client | Feature flag (default: true) |

Copy `.env.example` to `.env.local` and fill in values.

---

## Design System

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Navy 900 | `#102a43` | Primary brand, headings, buttons |
| Royal 600 | `#2563eb` | Secondary actions, links, charts |
| Emerald 600 | `#059669` | Success states, positive ROI |
| Gold 500 | `#f59e0b` | Accent highlights, warnings |
| Surface 1 | `#f8fafc` | Card backgrounds, sidebars |

### Typography

- **Sans**: Inter (UI text, headings)
- **Mono**: JetBrains Mono (metrics, financial values)

### Component Library

Built-in primitives in `src/components/ui/`:

- `Button` — 8 variants (default, secondary, outline, ghost, destructive, success, accent, link)
- `Card` / `MetricCard` — Content containers with metric display variant
- `Badge` — Status indicators (default, primary, secondary, success, warning, destructive)
- `Input` / `Label` — Form controls with error states
- `Alert` — Info, success, warning, destructive variants
- `Table` — Data tables with hover states
- `Chart` / `PerformanceChart` — Recharts wrappers with brand styling

### Spacing & Layout

- Page max-width: `80rem` (1280px)
- Section padding: `4rem` vertical
- Card padding: `1.5rem`
- Border radius: `rounded-2xl` for cards, `rounded-xl` for inputs/buttons

---

## Data Flow Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Component   │───▶│    Hook      │───▶│   Service    │───▶│   Supabase   │
│  (UI layer)  │    │ (React Query)│    │ (data layer) │    │  (DB + RLS)  │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

1. **Components** render UI, call hooks, handle user interaction
2. **Hooks** manage React Query cache, expose loading/error/data states
3. **Services** encapsulate Supabase queries, map DB → app types
4. **Supabase** enforces RLS, returns data

Server Components can bypass hooks and call services directly.

---

## Security Checklist

- [x] Supabase Auth with email verification
- [x] Row Level Security on all tables
- [x] Middleware route protection
- [x] Server-side role guards
- [x] Zod input validation schemas
- [x] Environment variable validation
- [x] Service role key server-only
- [x] Audit log table (ready for implementation)
- [ ] Rate limiting (future — Vercel / Supabase)
- [ ] CSRF protection (handled by Supabase SSR)
- [ ] Content Security Policy headers (future)

---

## Future Module Extension Points

The architecture supports these additions without restructuring:

| Module | Extension Point |
|--------|----------------|
| Multiple fund managers | Add `fund_managers` table, FK on trades |
| Multiple investment pools | Add `pools` table, migrate `pool_stats` to per-pool |
| Referral system | Add `referrals` feature module + table |
| KYC verification | Add `kyc_verifications` table + middleware check |
| Email notifications | Add Resend integration in `services/notification.service.ts` |
| PDF statements | Add `features/statements/` with PDF generation |
| Mobile app | Existing Supabase backend serves as API |
| API integrations | Add `app/api/v1/` route handlers |
| Investor rankings | Add materialized view on `investor_portfolios` |

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in Supabase credentials

# 3. Apply database schema
# Paste supabase/migrations/00001_initial_schema.sql into Supabase SQL Editor

# 4. Generate database types
npm run db:types

# 5. Start development server
npm run dev
```

---

## Next Steps (Page Development Phase)

1. Public landing page with live fund stats
2. Performance & transparency pages
3. Auth pages (login, register)
4. Investor dashboard & portfolio
5. Deposit/withdrawal request flows
6. Admin console (trade publishing, approvals)
7. Notification system
8. Statement generation
