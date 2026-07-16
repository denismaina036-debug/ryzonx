import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/middleware";
import { redirectWithSupabaseCookies } from "@/lib/supabase/middleware-redirect";
import { hasSupabaseSessionCookie } from "@/lib/auth/session-cookies";
import {
  canAccessRoute,
  getPostAuthRedirect,
  isAuthRoute,
} from "@/lib/auth/utils";
import { getEffectiveUserRole, isSafeRedirectPath } from "@/lib/auth/redirect";
import { ROUTES } from "@/constants/routes";
import { USER_ROLES, type UserRole } from "@/constants/roles";

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request);
  const pathname = request.nextUrl.pathname;

  if (pathname === "/about" || pathname === "/transparency") {
    return redirectWithSupabaseCookies(
      new URL(ROUTES.investors, request.url),
      supabaseResponse,
      request
    );
  }

  const hasSessionCookie = hasSupabaseSessionCookie(request);

  let user: { id: string } | null = null;
  let profileRole: UserRole | null = null;
  let supabaseReachable = true;

  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    user = authUser;

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      profileRole = (profile as { role: UserRole } | null)?.role ?? null;
    }
  } catch (error) {
    supabaseReachable = false;
    console.error("[middleware] Supabase auth check failed:", error);
  }

  const isAuthenticated = !!user || (!supabaseReachable && hasSessionCookie);
  const effectiveRole = getEffectiveUserRole(isAuthenticated, profileRole);

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && isAuthRoute(pathname)) {
    const requestedRedirect = request.nextUrl.searchParams.get("redirect");
    const destination =
      isSafeRedirectPath(requestedRedirect) &&
      canAccessRoute(requestedRedirect, effectiveRole)
        ? requestedRedirect
        : getPostAuthRedirect(effectiveRole ?? USER_ROLES.INVESTOR);

    return redirectWithSupabaseCookies(
      new URL(destination, request.url),
      supabaseResponse,
      request
    );
  }

  // Protect dashboard routes
  if (pathname.startsWith("/dashboard") && !isAuthenticated) {
    const loginUrl = new URL(ROUTES.login, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return redirectWithSupabaseCookies(loginUrl, supabaseResponse, request);
  }

  // Protect pool manager dashboard
  if (pathname.startsWith("/pool-manager") && !isAuthenticated) {
    const loginUrl = new URL(ROUTES.login, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return redirectWithSupabaseCookies(loginUrl, supabaseResponse, request);
  }

  // Protect pool manager application
  if (pathname.startsWith("/apply/pool-manager") && !isAuthenticated) {
    const loginUrl = new URL(ROUTES.login, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return redirectWithSupabaseCookies(loginUrl, supabaseResponse, request);
  }

  // Protect admin routes
  if (pathname.startsWith("/admin") && !isAuthenticated) {
    const loginUrl = new URL(ROUTES.login, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return redirectWithSupabaseCookies(loginUrl, supabaseResponse, request);
  }

  // Role-based access control (skip when Supabase is unreachable — defer to page)
  if (
    supabaseReachable &&
    user &&
    !canAccessRoute(pathname, effectiveRole)
  ) {
    const fallback = getPostAuthRedirect(effectiveRole ?? USER_ROLES.INVESTOR);
    return redirectWithSupabaseCookies(
      new URL(fallback, request.url),
      supabaseResponse,
      request
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
