"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import {
  resetPasswordSchema,
  type ResetPasswordSchema,
} from "@/lib/validations/auth";
import { ROUTES } from "@/constants/routes";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = createClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
  });

  async function onSubmit(data: ResetPasswordSchema) {
    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });

    if (error) {
      toast.error("Password reset failed", { description: error.message });
      return;
    }

    toast.success("Password updated successfully");
    router.push(ROUTES.login);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-navy-950">
          Set new password
        </h1>
        <p className="mt-2 text-sm text-navy-500">
          Choose a strong password for your account
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          label="New Password"
          htmlFor="password"
          required
          error={errors.password?.message}
        >
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            error={!!errors.password}
            {...register("password")}
          />
        </FormField>

        <FormField
          label="Confirm Password"
          htmlFor="confirmPassword"
          required
          error={errors.confirmPassword?.message}
        >
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            error={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
        </FormField>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          isLoading={isSubmitting}
        >
          Update Password
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-navy-500">
        <Link
          href={ROUTES.login}
          className="font-medium text-royal-600 hover:text-royal-700"
        >
          Back to Sign In
        </Link>
      </p>
    </div>
  );
}
