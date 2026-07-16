import type { NextRequest } from "next/server";

/**
 * Detect Supabase auth session cookies on the request.
 * Used when server-side Supabase calls fail (e.g. local SSL issues).
 */
export function hasSupabaseSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (cookie) =>
      cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token")
  );
}
