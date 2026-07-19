/**
 * Centralized authorization — single source of truth for server-side permission checks.
 * All sensitive operations must call requirePermission() or assertOwnership().
 */

import { requireAuth, requireRole } from "@/lib/auth/session";
import {
  hasPermission,
  hasMinimumRole,
  USER_ROLES,
  type Permission,
  type UserRole,
} from "@/constants/roles";

export class AuthorizationError extends Error {
  constructor(message = "Insufficient permissions.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Require authenticated user with a specific permission. */
export async function requirePermission(permission: Permission) {
  const user = await requireAuth();
  if (!hasPermission(user.role, permission)) {
    throw new AuthorizationError(`Permission denied: ${permission}`);
  }
  return user;
}

/** Require minimum role level. */
export async function requireMinimumRole(role: UserRole) {
  const user = await requireAuth();
  if (!hasMinimumRole(user.role, role)) {
    throw new AuthorizationError(`Role ${role} or higher required.`);
  }
  return user;
}

/** Administrators govern the platform — never trade or create pools as business owners. */
export async function requireAdministrator() {
  return requireRole(USER_ROLES.ADMINISTRATOR);
}

/** Pool Manager with approved profile. */
export async function requirePoolManager() {
  return requireRole(USER_ROLES.POOL_MANAGER);
}

/** Investor-level access (includes PM and admin). */
export async function requireInvestor() {
  const user = await requireAuth();
  if (!hasMinimumRole(user.role, USER_ROLES.INVESTOR)) {
    throw new AuthorizationError("Investor access required.");
  }
  return user;
}

/** Verify resource belongs to the acting pool manager. */
export function assertPoolManagerOwnership(
  resourceManagerId: string,
  actingManagerId: string
): void {
  if (resourceManagerId !== actingManagerId) {
    throw new AuthorizationError("You do not own this resource.");
  }
}

/** Administrators review and approve — they must not edit PM-owned business content directly. */
export function assertAdminDoesNotEditBusinessContent(action: "edit" | "create"): void {
  if (action === "edit" || action === "create") {
    throw new AuthorizationError(
      "Administrators govern and approve content but do not create or edit Pool Manager strategies or pools."
    );
  }
}
