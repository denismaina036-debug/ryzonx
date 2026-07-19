"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

/**
 * Surfaces Supabase auth redirect errors on login (e.g. expired verification links).
 */
export function AuthQueryToast() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    if (!error) return;

    const description =
      searchParams.get("error_description") ??
      (error === "auth_confirm_failed"
        ? "Your email confirmation link is invalid or has expired. Register again or request a new link."
        : "Authentication failed. Please try again.");

    toast.error(
      error === "auth_confirm_failed" ? "Email confirmation failed" : "Sign in failed",
      { description: decodeURIComponent(description.replace(/\+/g, " ")) }
    );
  }, [searchParams]);

  return null;
}
