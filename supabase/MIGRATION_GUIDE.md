# Automatic Supabase Migrations (Cursor / CLI)

One command links your project, applies all migrations, and regenerates TypeScript types.

## One-time setup

### 1. Log into the Supabase account that owns your Ryvonx project

```powershell
npm run supabase:login
```

Open the browser link and sign in with the account where project **ryzofund** / **gghqydmsustmfifsskjn** lives.

> If `supabase projects list` doesn't show your project, you're on the wrong account.

### 2. Add CLI credentials to `.env.local`

Open Supabase Dashboard → **Project Settings** → **Database** and copy your **database password**.

Add these lines to `.env.local` (alongside your existing Supabase keys):

```env
SUPABASE_PROJECT_REF=gghqydmsustmfifsskjn
SUPABASE_DB_PASSWORD=your-database-password-here
```

The project ref is auto-detected from `NEXT_PUBLIC_SUPABASE_URL` if you skip `SUPABASE_PROJECT_REF`.

### 3. Run migrations

```powershell
npm run db:migrate
```

This will:
1. Link the CLI to your remote Supabase project (once)
2. Push all files in `supabase/migrations/` in order
3. Regenerate `src/types/database.types.ts`

## From Cursor

- **Terminal:** `npm run db:migrate`
- **Command Palette:** `Tasks: Run Task` → **Supabase: Link & Migrate**
- **Agent:** Ask Cursor to run `npm run db:migrate` after schema changes

## Individual commands

| Command | What it does |
|---------|----------------|
| `npm run db:migrate` | Link + push + generate types (full sync) |
| `npm run db:push` | Push pending migrations only |
| `npm run db:types` | Regenerate TypeScript types |
| `npm run supabase:login` | Re-authenticate Supabase CLI |

## After migrations

Promote yourself to admin:

```sql
UPDATE profiles SET role = 'administrator' WHERE email = 'your@email.com';
```

## Troubleshooting

| Error | Fix |
|-------|-----|
| `relation "funds" does not exist` | Run full `npm run db:migrate` — migrations must run in order |
| `SUPABASE_DB_PASSWORD is missing` | Add it to `.env.local` |
| Link failed / project not found | Run `npm run supabase:login` with the correct account |
| `already exists` on 00001 | Some objects exist — continue; later migrations may still apply |
