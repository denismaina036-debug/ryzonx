import type { Metadata } from "next";
import { Suspense } from "react";
import { ROUTES } from "@/constants/routes";
import { buildNoIndexMetadata } from "@/lib/seo/metadata";
import { LoginForm } from "@/features/auth/components/login-form";
import { AuthQueryToast } from "@/features/auth/components/auth-query-toast";

export const metadata: Metadata = buildNoIndexMetadata({
  title: "Sign In",
  description: "Sign in to your RyvonX account to manage investments and pool activity.",
  path: ROUTES.login,
});

function LoginFormFallback() {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
      <div className="h-64 animate-pulse rounded-xl bg-surface-2" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <AuthQueryToast />
      <LoginForm />
    </Suspense>
  );
}
