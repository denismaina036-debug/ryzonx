"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField } from "@/components/ui/form-field";
import { loginSchema, type LoginSchema } from "@/lib/validations/auth";
import { useAuthActions } from "@/hooks/use-auth";
import { ROUTES } from "@/constants/routes";

export function LoginForm() {
  const { signIn } = useAuthActions();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginSchema) {
    await signIn(data, redirectTo);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-navy-950">Welcome back</h1>
        <p className="mt-2 text-sm text-navy-500">
          Sign in to your Ryvonx investor account
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

        <FormField
          label="Password"
          htmlFor="password"
          required
          error={errors.password?.message}
        >
          <PasswordInput
            id="password"
            placeholder="••••••••"
            autoComplete="current-password"
            error={!!errors.password}
            {...register("password")}
          />
        </FormField>

        <div className="flex justify-end">
          <Link
            href={ROUTES.forgotPassword}
            className="text-sm font-medium text-royal-600 hover:text-royal-700"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          isLoading={isSubmitting}
        >
          Sign In
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-navy-500">
        Don&apos;t have an account?{" "}
        <Link
          href={ROUTES.register}
          className="font-medium text-royal-600 hover:text-royal-700"
        >
          Join Pool
        </Link>
      </p>
    </div>
  );
}
