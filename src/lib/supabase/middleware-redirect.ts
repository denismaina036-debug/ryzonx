import { NextResponse, type NextRequest } from "next/server";

/**
 * Copy Supabase session cookies onto redirect responses.
 * Without this, middleware redirects can drop refreshed auth tokens.
 */
export function redirectWithSupabaseCookies(
  url: URL | string,
  supabaseResponse: NextResponse,
  request: NextRequest
): NextResponse {
  const redirectResponse = NextResponse.redirect(
    url instanceof URL ? url : new URL(url, request.url)
  );

  for (const cookie of supabaseResponse.cookies.getAll()) {
    redirectResponse.cookies.set(cookie.name, cookie.value);
  }

  return redirectResponse;
}
