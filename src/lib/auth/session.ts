import { createClient } from "@/lib/supabase/server";
import { mapProfileToUser } from "@/lib/auth/utils";
import { ensureInvestorBootstrap } from "@/lib/auth/ensure-investor-bootstrap";
import { parseRegistrationIntent } from "@/domain/investor/pm-journey-variant";
import type { UserProfile } from "@/types";
import type { User } from "@supabase/supabase-js";

/**
 * Get the current authenticated user with profile data.
 * Returns null if not authenticated or profile not found.
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  const supabase = await createClient();

  let user = null;

  try {
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return null;
    }

    user = authUser;
  } catch (error) {
    console.error("[getCurrentUser] Supabase auth failed:", error);
    return null;
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    try {
      await ensureInvestorBootstrap(user);
      const refetch = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      profile = refetch.data;
    } catch (error) {
      console.error("[getCurrentUser] Profile bootstrap failed:", error);
    }
  }

  if (!profile) {
    return null;
  }

  return mergeAuthMetadata(mapProfileToUser(profile), user);
}

function mergeAuthMetadata(profile: UserProfile, authUser: User): UserProfile {
  const meta = authUser.user_metadata ?? {};
  const country = typeof meta.country === "string" ? meta.country : null;

  return {
    ...profile,
    registrationIntent: parseRegistrationIntent(meta.registration_intent),
    registrationCountry: country,
  };
}

/**
 * Require authentication — throws if user is not logged in.
 * Use in Server Components and Server Actions.
 */
export async function requireAuth(): Promise<UserProfile> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  if (!user.isActive) {
    throw new Error("Account is deactivated");
  }

  return user;
}

/**
 * Require a specific role — throws if user lacks privilege.
 */
export async function requireRole(
  requiredRole: UserProfile["role"]
): Promise<UserProfile> {
  const user = await requireAuth();
  const { hasMinimumRole } = await import("@/constants/roles");

  if (!hasMinimumRole(user.role, requiredRole)) {
    throw new Error("Insufficient permissions");
  }

  return user;
}
