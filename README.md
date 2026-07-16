# Ryvonx

A transparent **Pool Trading Fund Management Platform** where investors participate in a professionally managed trading pool.

> Ryvonx is NOT a broker, copy trading platform, or exchange.

## Status

**Foundation phase complete.** Architecture, design system, authentication flow, database schema, and routing structure are ready. Application pages will be built in the next phase.

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

- [Architecture Guide](docs/ARCHITECTURE.md) — Full system design, routing, auth, database
- [Naming Conventions](docs/NAMING_CONVENTIONS.md) — File, code, and git conventions

## Project Structure

```
src/
├── app/           Route groups: (public), (auth), (dashboard), (admin)
├── components/    UI primitives + layout shells
├── constants/     Routes, roles, design tokens
├── features/      Domain modules (auth, pool, investor, admin)
├── hooks/         Shared React hooks
├── lib/           Supabase clients, auth, validations
├── providers/     React Query, Toast, Auth context
├── services/      Data access layer
├── styles/        Global CSS + design tokens
└── types/         TypeScript definitions
```

## Design

Premium investment aesthetic inspired by Stripe, Linear, and Mercury.

- **Primary**: Deep Navy (`#102a43`)
- **Secondary**: Royal Blue (`#2563eb`)
- **Success**: Emerald Green (`#059669`)
- **Accent**: Gold (`#f59e0b`)

## License

Private — All rights reserved.
