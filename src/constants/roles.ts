/**
 * Ryvonx User Roles
 *
 * Role hierarchy (ascending privilege):
 *   visitor < investor < pool_manager_applicant < pool_manager < administrator
 *
 * Roles are stored in the `profiles.role` column and enforced via:
 *   1. Supabase Row Level Security (RLS) policies
 *   2. Next.js middleware route guards
 *   3. Server-side authorization checks in API routes / server actions
 */

export const USER_ROLES = {
  VISITOR: "visitor",
  INVESTOR: "investor",
  POOL_MANAGER_APPLICANT: "pool_manager_applicant",
  POOL_MANAGER: "pool_manager",
  ADMINISTRATOR: "administrator",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [USER_ROLES.VISITOR]: 0,
  [USER_ROLES.INVESTOR]: 1,
  [USER_ROLES.POOL_MANAGER_APPLICANT]: 2,
  [USER_ROLES.POOL_MANAGER]: 3,
  [USER_ROLES.ADMINISTRATOR]: 4,
};

/**
 * Check if a role meets the minimum required privilege level.
 */
export function hasMinimumRole(
  userRole: UserRole | null | undefined,
  requiredRole: UserRole
): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function isPoolManagerRole(role: UserRole | null | undefined): boolean {
  return (
    role === USER_ROLES.POOL_MANAGER ||
    role === USER_ROLES.POOL_MANAGER_APPLICANT
  );
}

/**
 * Role-based route access configuration.
 * Middleware uses this to redirect unauthorized users.
 */
export const ROLE_ROUTE_ACCESS: Record<UserRole, string[]> = {
  [USER_ROLES.VISITOR]: [
    "/",
    "/about",
    "/performance",
    "/journal",
    "/faq",
    "/transparency",
    "/managers",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
  ],
  [USER_ROLES.INVESTOR]: ["/dashboard", "/apply"],
  [USER_ROLES.POOL_MANAGER_APPLICANT]: [
    "/dashboard",
    "/apply",
    "/pool-manager",
  ],
  [USER_ROLES.POOL_MANAGER]: ["/dashboard", "/apply", "/pool-manager"],
  [USER_ROLES.ADMINISTRATOR]: ["/admin", "/dashboard", "/pool-manager", "/apply"],
};

export const ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.VISITOR]: "Visitor",
  [USER_ROLES.INVESTOR]: "Investor",
  [USER_ROLES.POOL_MANAGER_APPLICANT]: "Pool Manager Applicant",
  [USER_ROLES.POOL_MANAGER]: "Pool Manager",
  [USER_ROLES.ADMINISTRATOR]: "Administrator",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [USER_ROLES.VISITOR]:
    "Can browse public fund information. Cannot invest until registered.",
  [USER_ROLES.INVESTOR]:
    "Can deposit, track portfolio, request withdrawals, and receive notifications.",
  [USER_ROLES.POOL_MANAGER_APPLICANT]:
    "Investor completing the Pool Manager application process.",
  [USER_ROLES.POOL_MANAGER]:
    "Approved professional who manages investment pools under RyvonX governance.",
  [USER_ROLES.ADMINISTRATOR]:
    "Full platform control including trade publishing, approvals, and reporting.",
};

/**
 * Permissions matrix for fine-grained access control.
 * Extend this as new features are added.
 */
export const PERMISSIONS = {
  // Public
  VIEW_PUBLIC_STATS: [
    USER_ROLES.VISITOR,
    USER_ROLES.INVESTOR,
    USER_ROLES.POOL_MANAGER_APPLICANT,
    USER_ROLES.POOL_MANAGER,
    USER_ROLES.ADMINISTRATOR,
  ],
  VIEW_JOURNAL: [
    USER_ROLES.VISITOR,
    USER_ROLES.INVESTOR,
    USER_ROLES.POOL_MANAGER_APPLICANT,
    USER_ROLES.POOL_MANAGER,
    USER_ROLES.ADMINISTRATOR,
  ],

  // Investor
  DEPOSIT_FUNDS: [
    USER_ROLES.INVESTOR,
    USER_ROLES.POOL_MANAGER_APPLICANT,
    USER_ROLES.POOL_MANAGER,
    USER_ROLES.ADMINISTRATOR,
  ],
  REQUEST_WITHDRAWAL: [
    USER_ROLES.INVESTOR,
    USER_ROLES.POOL_MANAGER_APPLICANT,
    USER_ROLES.POOL_MANAGER,
    USER_ROLES.ADMINISTRATOR,
  ],
  VIEW_OWN_PORTFOLIO: [
    USER_ROLES.INVESTOR,
    USER_ROLES.POOL_MANAGER_APPLICANT,
    USER_ROLES.POOL_MANAGER,
    USER_ROLES.ADMINISTRATOR,
  ],
  DOWNLOAD_STATEMENTS: [
    USER_ROLES.INVESTOR,
    USER_ROLES.POOL_MANAGER_APPLICANT,
    USER_ROLES.POOL_MANAGER,
    USER_ROLES.ADMINISTRATOR,
  ],

  // Pool Manager
  APPLY_POOL_MANAGER: [
    USER_ROLES.INVESTOR,
    USER_ROLES.POOL_MANAGER_APPLICANT,
    USER_ROLES.ADMINISTRATOR,
  ],
  VIEW_POOL_MANAGER_DASHBOARD: [
    USER_ROLES.POOL_MANAGER,
    USER_ROLES.ADMINISTRATOR,
  ],
  CREATE_POOL_PROPOSAL: [USER_ROLES.POOL_MANAGER, USER_ROLES.ADMINISTRATOR],
  EDIT_OWN_DRAFT_POOL: [USER_ROLES.POOL_MANAGER, USER_ROLES.ADMINISTRATOR],
  VIEW_OWN_POOL_INVESTORS: [USER_ROLES.POOL_MANAGER, USER_ROLES.ADMINISTRATOR],
  VIEW_OWN_POOL_ANALYTICS: [USER_ROLES.POOL_MANAGER, USER_ROLES.ADMINISTRATOR],

  // Admin
  APPROVE_DEPOSITS: [USER_ROLES.ADMINISTRATOR],
  APPROVE_WITHDRAWALS: [USER_ROLES.ADMINISTRATOR],
  PUBLISH_TRADES: [USER_ROLES.ADMINISTRATOR],
  UPDATE_POOL_VALUE: [USER_ROLES.ADMINISTRATOR],
  MANAGE_INVESTORS: [USER_ROLES.ADMINISTRATOR],
  PUBLISH_ANNOUNCEMENTS: [USER_ROLES.ADMINISTRATOR],
  GENERATE_REPORTS: [USER_ROLES.ADMINISTRATOR],
  MANAGE_SETTINGS: [USER_ROLES.ADMINISTRATOR],
  REVIEW_POOL_MANAGER_APPLICATIONS: [USER_ROLES.ADMINISTRATOR],
  APPROVE_POOLS: [USER_ROLES.ADMINISTRATOR],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(
  userRole: UserRole | null | undefined,
  permission: Permission
): boolean {
  if (!userRole) return false;
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(userRole);
}
