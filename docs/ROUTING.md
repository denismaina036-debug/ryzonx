# Ryvonx Application Routing Structure

This document maps every planned route to its route group, layout, and access level.

## Route Groups

```
src/app/
├── layout.tsx                    # Root layout (fonts, providers)
├── (public)/                     # Public pages
│   ├── layout.tsx                # PublicLayout (header + footer)
│   ├── page.tsx                  # / (landing)
│   ├── about/                    # /about
│   ├── performance/              # /performance
│   ├── journal/                  # /journal
│   ├── faq/                      # /faq
│   └── transparency/             # /transparency
├── (auth)/                       # Authentication pages
│   ├── layout.tsx                # AuthLayout (centered form)
│   ├── login/                    # /login
│   ├── register/                 # /register
│   ├── forgot-password/          # /forgot-password
│   ├── reset-password/           # /reset-password
│   └── verify-email/             # /verify-email
├── (dashboard)/                  # Investor portal
│   ├── layout.tsx                # DashboardLayout (sidebar)
│   └── dashboard/
│       ├── page.tsx              # /dashboard
│       ├── portfolio/            # /dashboard/portfolio
│       ├── deposits/             # /dashboard/deposits
│       ├── withdrawals/          # /dashboard/withdrawals
│       ├── transactions/         # /dashboard/transactions
│       ├── statements/           # /dashboard/statements
│       ├── notifications/        # /dashboard/notifications
│       └── settings/             # /dashboard/settings
├── (admin)/                      # Admin console
│   ├── layout.tsx                # AdminLayout (dark sidebar)
│   └── admin/
│       ├── page.tsx              # /admin
│       ├── trades/               # /admin/trades
│       ├── pool/                 # /admin/pool
│       ├── deposits/             # /admin/deposits
│       ├── withdrawals/          # /admin/withdrawals
│       ├── investors/            # /admin/investors
│       ├── announcements/        # /admin/announcements
│       ├── reports/              # /admin/reports
│       └── settings/             # /admin/settings
└── auth/
    └── callback/
        └── route.ts              # /auth/callback (API)
```

## Access Control Matrix

| Route Pattern | Visitor | Investor | Admin | Middleware | Server Guard |
|--------------|---------|----------|-------|------------|--------------|
| `/` | ✅ | ✅ | ✅ | — | — |
| `/about`, `/performance`, etc. | ✅ | ✅ | ✅ | — | — |
| `/login`, `/register` | ✅ | Redirect | Redirect | Session check | — |
| `/dashboard/*` | Redirect | ✅ | ✅ | Auth required | `requireAuth()` |
| `/admin/*` | Redirect | Denied | ✅ | Auth + role | `requireRole('administrator')` |

## Layout Hierarchy

```
RootLayout (fonts, QueryProvider, ToastProvider)
├── PublicLayout (header, footer, main)
│   ├── Public pages
│   └── AuthLayout (centered container)
│       └── Auth pages
├── DashboardLayout (sidebar, main)
│   └── Investor pages
└── AdminLayout (dark sidebar, main)
    └── Admin pages
```

## Adding a New Route

1. Create folder under the appropriate route group
2. Add `page.tsx` (and `layout.tsx` if nested layout needed)
3. Add route constant to `src/constants/routes.ts`
4. Add nav item to the relevant layout sidebar/header
5. Add RLS policies if new data access is needed
6. Add query keys to `QUERY_KEYS` in routes.ts
