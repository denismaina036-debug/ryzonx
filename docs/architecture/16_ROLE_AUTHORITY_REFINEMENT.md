# Role Authority & Permission Refinement

Version: 2.0 — aligns operational roles with centralized enforcement.

Depends on: [08_USER_ROLES_AND_PERMISSIONS.md](./08_USER_ROLES_AND_PERMISSIONS.md)

## Operational Roles

| Role | Responsibility |
|------|----------------|
| **Administrator** | Platform governance, configuration, compliance — does not create pools or trade |
| **Pool Manager** | Owns strategies, pools, cycles, journal, settlements, wallet |
| **Investor** | Portfolio, follows, reviews after completed cycles, profile |

## Centralized Enforcement

| Layer | Path |
|-------|------|
| Permission matrix | `src/constants/roles.ts` — `PERMISSIONS`, `hasPermission()` |
| Server guards | `src/lib/auth/authorization.ts` — `requirePermission()`, `requireAdministrator()` |
| Session | `src/lib/auth/session.ts` — `requireAuth()`, `requireRole()` |
| Middleware | `src/middleware.ts` — route-level role access |

All sensitive API routes and services must call server-side permission checks. The frontend mirrors permissions for UX only.

## Platform Settings (Admin)

Persisted in `platform_settings` via `platform-settings.service.ts`:

- Platform service fee (default 2.5%) — affects **future** settlements only
- Branding, contact, landing content, feature flags
- Financial limits (min investment, min/max withdrawal)
- Maintenance mode, registration toggles

Admin UI: `/admin/settings` — wired to `PATCH /api/admin/platform-settings`

## Versioning & Active-Cycle Locking

| Entity | Before approval | After approval |
|--------|-----------------|----------------|
| **Strategy** | Full PM edit | Edits → `pending_revision` + admin review; active-cycle lock if in use |
| **Pool** | Draft edit | Revisions via `entity-revision.service`; **locked** while cycle is active |

Active cycle statuses that lock pool config: `approved`, `funding`, `trading`, `distribution`.

Service: `pool-governance-lock.service.ts`

Completed cycles retain their original `pool_config_version` snapshot.

## Investor Social

| Feature | Service | API |
|---------|---------|-----|
| Follow managers | `investor-follow.service.ts` | `/api/investor/follows` |
| Reviews (post completed cycle) | `pool-manager-review.service.ts` | `/api/investor/managers/[id]/reviews` |

One review per completed participation. Admins may remove policy violations via `MODERATE_REVIEWS`.

## User Administration

`user-admin.service.ts` — list/search users, update role and account status.

- Admins see all profile fields **except passwords** (never stored in profiles)
- All changes audit-logged

UI: `/admin/users`

## Audit

All admin setting changes, revision approvals, user updates, and review moderation generate `audit_logs` entries via `auditService.log()`.

## Migration

Apply `00036_role_authority_governance.sql` for follows, reviews, revision columns, settings seeds, and admin profile update policy.
