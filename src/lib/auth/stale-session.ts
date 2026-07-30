import type { AuthError } from "@supabase/supabase-js";

/** Stale or missing refresh token — treat as logged out, not a hard failure. */
export function isStaleRefreshTokenError(error: AuthError | Error | null | undefined): boolean {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("refresh token not found") ||
    message.includes("invalid refresh token")
  );
}
