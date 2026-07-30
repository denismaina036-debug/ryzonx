import type { Metadata } from "next";
import { ROUTES } from "@/constants/routes";
import { buildNoIndexMetadata } from "@/lib/seo/metadata";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = buildNoIndexMetadata({
  title: "Forgot Password",
  description: "Reset your RyvonX account password securely via email.",
  path: ROUTES.forgotPassword,
});

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
