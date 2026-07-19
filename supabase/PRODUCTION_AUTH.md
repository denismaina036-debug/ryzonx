# RyvonX Production Auth Configuration

Official production domain: **https://ryvonx.com**

Configure these settings in the [Supabase Dashboard](https://supabase.com/dashboard) for the production project.

## Authentication → URL Configuration

| Setting | Value |
|---------|--------|
| **Site URL** | `https://ryvonx.com` |
| **Redirect URLs** | `https://ryvonx.com/auth/callback` |
| | `https://ryvonx.com/reset-password` |
| | `https://ryvonx.com/verify-email` |

Do **not** add `localhost` or temporary preview URLs to the production project.

## Application environment (Vercel / hosting)

```env
NEXT_PUBLIC_APP_URL=https://ryvonx.com
NEXT_PUBLIC_APP_ENV=production
```

## Canonical host

Redirect `www.ryvonx.com` → `https://ryvonx.com` (handled in `next.config.ts`).

## Email

- Sender: `notifications@ryvonx.com`
- Links in templates use `NEXT_PUBLIC_APP_URL` at runtime
- Brand URLs: `https://ryvonx.com` (see `src/services/communication/email/tokens.ts`)

## Local development

Use `supabase/config.toml` (localhost) and `.env.local` with `NEXT_PUBLIC_APP_URL=http://localhost:3000` — **local only**, never in production.
