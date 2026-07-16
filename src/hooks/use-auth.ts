"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";
import { ROUTES } from "@/constants/routes";
import { USER_ROLES } from "@/constants/roles";
import { getPostAuthRedirect, canAccessRoute } from "@/lib/auth/utils";
import { getEffectiveUserRole, isSafeRedirectPath } from "@/lib/auth/redirect";
import { formatFullName, normalizePhone } from "@/lib/auth/register";
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
      const fullName = formatFullName({
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
      });
      const phone = normalizePhone(data.phone);
      const middleName = data.middleName?.trim();

      const metadata: Record<string, string> = {
        first_name: data.firstName.trim(),
        last_name: data.lastName.trim(),
        full_name: fullName,
        phone,
      };

      if (middleName) {
        metadata.middle_name = middleName;
      }

      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: {
          data: metadata,
          emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
      });

      if (error) {
        toast.error("Registration failed", {
          description: getAuthErrorMessage(error),
        });
        return { success: false as const, error: getAuthErrorMessage(error) };
      }

      if (authData.user?.identities?.length === 0) {
        toast.error("Registration failed", {
          description:
            "An account with this email already exists. Try signing in instead.",
        });
        return {
          success: false as const,
          error: "An account with this email already exists.",
        };
      }

      if (authData.session) {
        toast.success("Welcome to Ryvonx!", {
          description: "Your investor account is ready.",
        });
        hardNavigate(ROUTES.dashboard);
        return { success: true as const };
      }

      toast.success("Account created!", {
        description: "Please check your email to verify your account.",
      });
      router.push(ROUTES.verifyEmail);
      return { success: true as const };
    },
    [supabase, router]
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
        redirectTo: `${window.location.origin}/reset-password`,
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
