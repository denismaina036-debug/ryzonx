import type { NextRequest } from "next/server";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

export function isSupabaseAuthCookieName(name: string): boolean {
  return name.startsWith("sb-") && name.includes("-auth-token");
}

/**
 * Detect Supabase auth session cookies on the request.
 * Used when server-side Supabase calls fail (e.g. local SSL issues).
 */
export function hasSupabaseSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => isSupabaseAuthCookieName(cookie.name));
}

/** Server Component / Route Handler cookie store variant. */
export function hasServerSupabaseSessionCookie(
  cookieStore: Pick<ReadonlyRequestCookies, "getAll">
): boolean {
  return cookieStore.getAll().some((cookie) => isSupabaseAuthCookieName(cookie.name));
}
