"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import {
  forgotPasswordSchema,
  type ForgotPasswordSchema,
} from "@/lib/validations/auth";
import { useAuthActions } from "@/hooks/use-auth";
import { ROUTES } from "@/constants/routes";

export function ForgotPasswordForm() {
  const { resetPassword } = useAuthActions();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordSchema) {
    await resetPassword(data.email);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-navy-950">
          Reset your password
        </h1>
        <p className="mt-2 text-sm text-navy-500">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          label="Email"
          htmlFor="email"
          required
          error={errors.email?.message}
        >
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            error={!!errors.email}
            {...register("email")}
          />
        </FormField>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          isLoading={isSubmitting}
        >
          Send Reset Link
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href={ROUTES.login}
          className="inline-flex items-center gap-2 text-sm font-medium text-royal-600 hover:text-royal-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
