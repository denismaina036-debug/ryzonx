import { USER_ROLES, type UserRole } from "@/constants/roles";

/**
 * Authenticated users without a profile row yet should still reach the
 * investor portal — they are not anonymous visitors.
 */
export function getEffectiveUserRole(
  isAuthenticated: boolean,
  profileRole: UserRole | null | undefined
): UserRole | null {
  if (!isAuthenticated) return null;
  return profileRole ?? USER_ROLES.INVESTOR;
}

/**
 * Only allow same-origin relative redirects from auth flows.
 */
export function isSafeRedirectPath(path: string | null | undefined): path is string {
  if (!path) return false;
  return path.startsWith("/") && !path.startsWith("//");
}
