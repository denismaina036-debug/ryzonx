"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getResetPasswordUrl } from "@/lib/app-url";
import { ROUTES } from "@/constants/routes";
import { USER_ROLES } from "@/constants/roles";
import { getPostAuthRedirect, canAccessRoute } from "@/lib/auth/utils";
import { getEffectiveUserRole, isSafeRedirectPath } from "@/lib/auth/redirect";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import type { UserRole } from "@/constants/roles";
import type { LoginFormData, RegisterFormData } from "@/types";

function hardNavigate(path: string) {
  window.location.assign(path);
}

export function useAuthActions() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const signIn = useCallback(
    async (data: LoginFormData, redirectTo?: string | null) => {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email.trim(),
        password: data.password,
      });

      if (error) {
        toast.error("Sign in failed", {
          description: getAuthErrorMessage(error),
        });
        return { success: false as const, error: error.message };
      }

      await supabase.auth.getSession();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      let profileRole: UserRole | null = null;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle<{ role: UserRole }>();
        profileRole = profile?.role ?? null;
      }

      const role =
        getEffectiveUserRole(!!user, profileRole) ?? USER_ROLES.INVESTOR;
      const destination =
        isSafeRedirectPath(redirectTo) && canAccessRoute(redirectTo, role)
          ? redirectTo
          : getPostAuthRedirect(role);

      toast.success("Welcome back!");
      hardNavigate(destination);
      return { success: true as const };
    },
    [supabase]
  );

  const signUp = useCallback(
    async (data: RegisterFormData) => {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email.trim(),
          password: data.password,
          firstName: data.firstName.trim(),
          middleName: data.middleName?.trim() || undefined,
          lastName: data.lastName.trim(),
          phone: data.phone,
          country: data.country?.trim() || undefined,
          referralCode: data.referralCode?.trim() || undefined,
          registrationIntent: data.registrationIntent,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        redirectTo?: string;
        needsVerification?: boolean;
      };

      if (!response.ok) {
        const message = payload.error ?? "Registration failed. Please try again.";
        toast.error("Registration failed", { description: message });
        return { success: false as const, error: message };
      }

      if (payload.needsVerification) {
        toast.success("Account created!", {
          description: "Please check your email to verify your account.",
        });
        router.push(payload.redirectTo ?? ROUTES.verifyEmail);
        return { success: true as const };
      }

      try {
        const acceptanceRes = await fetch("/api/legal/register-acceptance", {
          method: "POST",
        });
        if (!acceptanceRes.ok) {
          // Pending gate will auto-record on first authenticated load if needed.
        }
      } catch {
        // Acceptance can be completed after login if this request fails.
      }

      toast.success("Welcome to Ryvonx!", {
        description: "Your investor account is ready.",
      });
      hardNavigate(payload.redirectTo ?? ROUTES.dashboard);
      return { success: true as const };
    },
    [router]
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error("Sign out failed", {
        description: error.message,
      });
      return;
    }

    toast.success("Signed out successfully");
    hardNavigate(ROUTES.home);
  }, [supabase]);

  const resetPassword = useCallback(
    async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getResetPasswordUrl(),
      });

      if (error) {
        toast.error("Password reset failed", {
          description: error.message,
        });
        return { success: false as const, error: error.message };
      }

      toast.success("Reset link sent", {
        description: "Check your email for the password reset link.",
      });
      return { success: true as const };
    },
    [supabase]
  );

  return { signIn, signUp, signOut, resetPassword };
}
