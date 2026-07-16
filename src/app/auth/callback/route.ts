import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureInvestorBootstrap } from "@/lib/auth/ensure-investor-bootstrap";
import { getEffectiveUserRole, isSafeRedirectPath } from "@/lib/auth/redirect";
import { canAccessRoute, getPostAuthRedirect } from "@/lib/auth/utils";
import { USER_ROLES, type UserRole } from "@/constants/roles";

/**
 * Supabase Auth callback handler.
 * Exchanges auth code for session after email verification or OAuth.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
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
      const role =
        getEffectiveUserRole(true, profileRole) ?? USER_ROLES.INVESTOR;
      const destination =
        isSafeRedirectPath(next) && canAccessRoute(next, role)
          ? next
          : getPostAuthRedirect(role);

      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
