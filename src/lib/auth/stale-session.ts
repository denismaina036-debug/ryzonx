import type { AuthError } from "@supabase/supabase-js";

/** Stale or missing refresh token — treat as logged out, not a hard failure. */
export function isStaleRefreshTokenError(error: AuthError | Error | null | undefined): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  const code = "code" in error ? String((error as AuthError).code ?? "").toLowerCase() : "";
  return (
    message.includes("refresh token not found") ||
    message.includes("invalid refresh token") ||
    code === "refresh_token_not_found"
  );
}

/** Best-effort session cleanup — safe when cookies cannot be written (RSC). */
export async function clearStaleAuthSession(supabase: {
  auth: { signOut: (opts?: { scope?: "local" | "global" | "others" }) => Promise<unknown> };
}): Promise<void> {
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
}
