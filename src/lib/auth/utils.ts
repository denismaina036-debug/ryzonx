import { USER_ROLES, hasMinimumRole, type UserRole } from "@/constants/roles";

import { ROUTES } from "@/constants/routes";

import type { UserProfile } from "@/types";

import type { Tables } from "@/types/database.types";



type ProfileRow = Tables<"profiles">;



/**

 * Map database profile row to application UserProfile type.

 */

export function mapProfileToUser(row: ProfileRow): UserProfile {

  return {

    id: row.id,

    email: row.email,

    fullName: row.full_name,

    avatarUrl: row.avatar_url,

    role: row.role as UserRole,

    phone: row.phone,

    isActive: row.is_active,

    emailVerified: true,

    createdAt: row.created_at,

    updatedAt: row.updated_at,

  };

}



/**

 * Determine redirect path after successful authentication.

 */

export function getPostAuthRedirect(role: UserRole): string {

  switch (role) {

    case USER_ROLES.ADMINISTRATOR:

      return ROUTES.admin;

    case USER_ROLES.POOL_MANAGER:

      return ROUTES.poolManager;

    case USER_ROLES.POOL_MANAGER_APPLICANT:

      return ROUTES.applyPoolManager;

    case USER_ROLES.INVESTOR:

      return ROUTES.dashboard;

    default:

      return ROUTES.home;

  }

}



/**

 * Check if user can access a protected route.

 */

export function canAccessRoute(

  pathname: string,

  role: UserRole | null

): boolean {

  if (pathname.startsWith("/admin")) {

    return hasMinimumRole(role, USER_ROLES.ADMINISTRATOR);

  }



  if (pathname.startsWith("/pool-manager")) {

    return hasMinimumRole(role, USER_ROLES.POOL_MANAGER);

  }



  if (pathname.startsWith("/apply/pool-manager")) {

    return hasMinimumRole(role, USER_ROLES.INVESTOR);

  }



  if (pathname.startsWith("/dashboard")) {

    return hasMinimumRole(role, USER_ROLES.INVESTOR);

  }



  return true;

}



/**

 * Routes that should redirect authenticated users away (login, register).

 */

export function isAuthRoute(pathname: string): boolean {

  const authPaths = [

    ROUTES.login,

    ROUTES.register,

    ROUTES.forgotPassword,

    ROUTES.resetPassword,

  ];

  return authPaths.some(

    (path) => pathname === path || pathname.startsWith(`${path}/`)

  );

}



/**

 * Public routes that never require authentication.

 */

export function isPublicRoute(pathname: string): boolean {

  const publicPaths = [

    ROUTES.home,

    ROUTES.performance,

    ROUTES.journal,

    ROUTES.investors,

    ROUTES.howItWorks,

    ROUTES.faq,

    ROUTES.contact,

    ROUTES.about,

    ROUTES.marketplace,

    ROUTES.managerPublicProfile,

  ];

  return publicPaths.some(

    (path) => pathname === path || pathname.startsWith(`${path}/`)

  );

}

