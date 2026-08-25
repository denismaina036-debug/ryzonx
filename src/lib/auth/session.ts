import { createClient } from "@/lib/supabase/server";
import { mapProfileToUser } from "@/lib/auth/utils";
import { ensureInvestorBootstrap } from "@/lib/auth/ensure-investor-bootstrap";
import {
  clearStaleAuthSession,
  isStaleRefreshTokenError,
} from "@/lib/auth/stale-session";
import {
  hasServerSupabaseSessionCookie,
  readServerSupabaseSession,
} from "@/lib/auth/session-cookies";
import { parseRegistrationIntent } from "@/domain/investor/pm-journey-variant";
import type { UserProfile } from "@/types";
import type { User, AuthError } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function isSessionFresh(expiresAt: number | undefined): boolean {
  if (!expiresAt) return true;
  // Supabase starts refresh recovery 90 seconds before token expiry.
  // Public shells stay anonymous in that small window instead of attempting
  // recovery for a stale browser session and surfacing an AuthApiError.
  return expiresAt * 1000 > Date.now() + 95_000;
}

/**
 * Lightweight auth for public shells — reads the cookie session only.
 * Does not call Auth refresh APIs (avoids stale refresh-token errors on /login).
 */
export async function getShellUser(): Promise<UserProfile | null> {
  const cookieStore = await cookies();
  const session = readServerSupabaseSession(cookieStore);

  if (!session?.user || !isSessionFresh(session.expires_at)) {
    return null;
  }

  const supabase = await createClient();

  try {
    return loadProfileForAuthUser(supabase, session.user);
  } catch {
    return null;
  }
}

async function loadProfileForAuthUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: User
): Promise<UserProfile | null> {
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
    } catch {
      return null;
    }
  }

  if (!profile) return null;
  return mergeAuthMetadata(mapProfileToUser(profile), user);
}

/**
 * Get the current authenticated user with profile data.
 * Returns null if not authenticated or profile not found.
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  const cookieStore = await cookies();
  if (!hasServerSupabaseSessionCookie(cookieStore)) {
    return null;
  }

  const supabase = await createClient();

  let user = null;

  try {
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      if (isStaleRefreshTokenError(authError)) {
        await clearStaleAuthSession(supabase);
      }
      return null;
    }

    if (!authUser) {
      return null;
    }

    user = authUser;
  } catch (error) {
    if (isStaleRefreshTokenError(error as AuthError)) {
      await clearStaleAuthSession(supabase);
      return null;
    }
    return null;
  }

  return loadProfileForAuthUser(supabase, user);
}

function mergeAuthMetadata(profile: UserProfile, authUser: User): UserProfile {
  const meta = authUser.user_metadata ?? {};
  const country = typeof meta.country === "string" ? meta.country : null;

  return {
    ...profile,
    registrationIntent: parseRegistrationIntent(meta.registration_intent),
    registrationCountry: country,
    acceptedLegalAtSignup: meta.accepted_legal_at_signup === "true",
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
