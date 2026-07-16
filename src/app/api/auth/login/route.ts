import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureInvestorBootstrap } from "@/lib/auth/ensure-investor-bootstrap";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { getEffectiveUserRole, isSafeRedirectPath } from "@/lib/auth/redirect";
import { canAccessRoute, getPostAuthRedirect } from "@/lib/auth/utils";
import { USER_ROLES, type UserRole } from "@/constants/roles";

export async function POST(request: Request) {
  try {
    let body: { email?: string; password?: string; redirectTo?: string | null };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const email = body.email?.trim();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: getAuthErrorMessage(error) },
        { status: 401 }
      );
    }

    if (data.user) {
      try {
        await ensureInvestorBootstrap(data.user);
      } catch {
        // Best-effort bootstrap
      }
    }

    let profileRole: UserRole | null = null;
    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      profileRole = (profile as { role: UserRole } | null)?.role ?? null;
    }

    const role =
      getEffectiveUserRole(!!data.user, profileRole) ?? USER_ROLES.INVESTOR;

    const redirectTo =
      isSafeRedirectPath(body.redirectTo) &&
      canAccessRoute(body.redirectTo, role)
        ? body.redirectTo
        : getPostAuthRedirect(role);

    return NextResponse.json({ redirectTo, role });
  } catch (error) {
    console.error("[api/auth/login]", error);
    const message =
      error instanceof Error && error.message.includes("fetch failed")
        ? "Server cannot reach Supabase. Sign in using the browser client instead."
        : "Login failed unexpectedly. Please try again.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
