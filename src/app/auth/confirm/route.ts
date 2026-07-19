import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { ensureInvestorBootstrap } from "@/lib/auth/ensure-investor-bootstrap";
import { getEffectiveUserRole, isSafeRedirectPath } from "@/lib/auth/redirect";
import { canAccessRoute, getPostAuthRedirect } from "@/lib/auth/utils";
import { USER_ROLES, type UserRole } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";

/**
 * PKCE email confirmation handler.
 * Exchanges token_hash from the verification email for a session via verifyOtp.
 * @see https://supabase.com/docs/guides/auth/passwords?flow=pkce
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      `${origin}${ROUTES.login}?error=auth_confirm_failed&error_description=${encodeURIComponent("Invalid verification link.")}`
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error || !data.user) {
    console.error("[auth/confirm]", error?.message ?? "verifyOtp failed");
    const description = encodeURIComponent(
      error?.message ?? "Email link is invalid or has expired."
    );
    return NextResponse.redirect(
      `${origin}${ROUTES.login}?error=auth_confirm_failed&error_code=${encodeURIComponent(error?.code ?? "otp_expired")}&error_description=${description}`
    );
  }

  try {
    await ensureInvestorBootstrap(data.user);
  } catch {
    // Profile bootstrap can be retried on first dashboard load
  }

  let profileRole: UserRole | null = null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  profileRole = (profile as { role: UserRole } | null)?.role ?? null;
  const role = getEffectiveUserRole(true, profileRole) ?? USER_ROLES.INVESTOR;
  const destination =
    isSafeRedirectPath(next) && canAccessRoute(next, role)
      ? next
      : getPostAuthRedirect(role);

  return NextResponse.redirect(`${origin}${destination}`);
}
