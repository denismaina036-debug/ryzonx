import type { Metadata } from "next";
import { ROUTES } from "@/constants/routes";
import { buildNoIndexMetadata } from "@/lib/seo/metadata";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = buildNoIndexMetadata({
  title: "Reset Password",
  description: "Choose a new password for your RyvonX account.",
  path: ROUTES.resetPassword,
});

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
