# Ryvonx

A transparent **Pool Trading Fund Management Platform** where investors participate in a professionally managed trading pool.

> Ryvonx is NOT a broker, copy trading platform, or exchange.

## Status

**Active development.** The platform includes investor, admin, pool manager, and marketplace surfaces backed by Supabase, with architecture and implementation documentation in `docs/`.

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage, RLS)
- **State**: TanStack React Query
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Deploy**: Vercel

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Add your Supabase project credentials

# Apply database schema
# Run supabase/migrations/00001_initial_schema.sql in Supabase SQL Editor

# Generate types
npm run db:types

# Start dev server
npm run dev
```

## Documentation

- [Documentation Index](docs/README.md) — Official documentation system
- [Architecture Specifications](docs/architecture/01_RYVONX_INVESTMENT_ARCHITECTURE.md) — Platform architecture
- [Implementation Playbook](docs/implementation/README.md) — Engineering standards and phase roadmap
- [Phase 1 Audit Report](docs/implementation/PHASE_1_AUDIT_REPORT.md) — Foundation audit findings
- [Naming Conventions](docs/NAMING_CONVENTIONS.md) — File, code, and git conventions

## Project Structure

```
src/
├── app/           Route groups: (public), (auth), (dashboard), (admin), (pool-manager), (apply)
├── components/    UI primitives + layout shells
├── constants/     Routes, roles, design tokens
├── domain/        Bounded domain types
├── features/      Domain modules (auth, investor, admin, marketplace, pool-manager, public)
├── hooks/         Shared React hooks
├── lib/           Supabase clients, auth, validations, utilities
├── providers/     React Query, Toast, Auth context
├── services/      Data access layer
├── store/         Client store placeholder
├── styles/        Global CSS + design tokens
└── types/         TypeScript definitions + generated DB types

docs/
├── architecture/  Platform architecture specifications
├── implementation/ Engineering playbook and phase specs
├── design/        UI/UX references
└── references/    Terminology and screenshot index
```

## Design

Premium investment aesthetic inspired by Stripe, Linear, and Mercury.

- **Primary**: Deep Navy (`#102a43`)
- **Secondary**: Royal Blue (`#2563eb`)
- **Success**: Emerald Green (`#059669`)
- **Accent**: Gold (`#f59e0b`)

## License

Private — All rights reserved.
