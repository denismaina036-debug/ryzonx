import { Suspense } from "react";
import { LoginForm } from "@/features/auth/components/login-form";

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
      <LoginForm />
    </Suspense>
  );
}
