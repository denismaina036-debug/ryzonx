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

## Send Email Hook (auth emails via RyvonX templates + Resend)

**Authentication → Hooks → Send Email**

| Setting | Value |
|---------|--------|
| **Type** | HTTPS |
| **URL** | `https://ryvonx.com/api/auth/send-email` |
| **Secret** | Generate in dashboard → add to Vercel as `SEND_EMAIL_HOOK_SECRET` |

When this hook is **enabled**, Supabase does **not** send auth emails itself — your app must handle them. The URL must be the API route above, **not** the homepage.

### Vercel environment variables (required for auth + platform email)

```env
NEXT_PUBLIC_APP_URL=https://ryvonx.com
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
RESEND_API_KEY=re_...
EMAIL_FROM=notifications@ryvonx.com
SEND_EMAIL_HOOK_SECRET=v1,whsec_...   # full value from Supabase hook
```

Redeploy after changing env vars.

## Custom SMTP (alternative — disable Send Email hook)

If you **disable** the Send Email hook, configure **Authentication → SMTP** with Resend:

| Field | Value |
|-------|--------|
| Host | `smtp.resend.com` |
| Port | `587` |
| Username | `resend` |
| Password | Resend API key |
| Sender | `notifications@ryvonx.com` |

Then customize templates under **Authentication → Email Templates** (Supabase HTML, not RyvonX Communication Center).

## Canonical host

Redirect `www.ryvonx.com` → `https://ryvonx.com` (handled in `next.config.ts`).

**Vercel Domains:** set `ryvonx.com` as **Primary**. Set `www.ryvonx.com` to **Redirect to ryvonx.com**. Do not redirect apex → www (causes redirect loops).

## Email branding

- Sender: `notifications@ryvonx.com`
- Resend domain: verify `ryvonx.com`
- Platform templates: Admin → Communication → Sync catalog

## Local development

Use `supabase/config.toml` (localhost) and `.env.local` with `NEXT_PUBLIC_APP_URL=http://localhost:3000` — **local only**, never in production.
