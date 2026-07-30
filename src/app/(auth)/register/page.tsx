import type { Metadata } from "next";
import { Suspense } from "react";
import { ROUTES } from "@/constants/routes";
import { buildNoIndexMetadata } from "@/lib/seo/metadata";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = buildNoIndexMetadata({
  title: "Create Account",
  description: "Create your RyvonX account to invest in verified trading pools or manage your own.",
  path: ROUTES.register,
});

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
