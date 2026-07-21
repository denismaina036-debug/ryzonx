"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField } from "@/components/ui/form-field";
import { ReferenceCountryPicker } from "@/components/reference-data/reference-country-picker";
import { createRegisterSchema, type RegisterSchemaWithIntent } from "@/lib/validations/auth";
import { useAuthActions } from "@/hooks/use-auth";
import { ROUTES } from "@/constants/routes";
import {
  REGISTRATION_INTENTS,
  isRegistrationIntent,
  type RegistrationIntent,
} from "@/constants/registration";

function resolveIntent(raw: string | null): RegistrationIntent {
  return isRegistrationIntent(raw) ? raw : REGISTRATION_INTENTS.JOIN_POOL;
}

export function RegisterForm() {
  const searchParams = useSearchParams();
  const intent = resolveIntent(searchParams.get("intent"));
  const isCreatePool = intent === REGISTRATION_INTENTS.CREATE_POOL;
  const schema = useMemo(() => createRegisterSchema(intent), [intent]);
  const { signUp } = useAuthActions();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterSchemaWithIntent>({
    resolver: zodResolver(schema),
    defaultValues: {
      middleName: "",
      country: "",
    },
  });

  const country = watch("country");

  async function onSubmit(data: RegisterSchemaWithIntent) {
    await signUp({
      email: data.email,
      password: data.password,
      confirmPassword: data.confirmPassword,
      firstName: data.firstName,
      middleName: data.middleName,
      lastName: data.lastName,
      phone: data.phone,
      country: data.country,
      registrationIntent: intent,
      acceptTerms: data.acceptTerms,
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-navy-950">
          {isCreatePool ? "Create your RyvonX account" : "Join Ryvonx"}
        </h1>
        <p className="mt-2 text-sm text-navy-500">
          {isCreatePool
            ? "Create your account and start managing investor capital"
            : "Create your account and start investing in the pool"}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label="First Name"
            htmlFor="firstName"
            required
            error={errors.firstName?.message}
          >
            <Input
              id="firstName"
              placeholder="John"
              autoComplete="given-name"
              error={!!errors.firstName}
              {...register("firstName")}
            />
          </FormField>

          <FormField
            label="Last Name"
            htmlFor="lastName"
            required
            error={errors.lastName?.message}
          >
            <Input
              id="lastName"
              placeholder="Smith"
              autoComplete="family-name"
              error={!!errors.lastName}
              {...register("lastName")}
            />
          </FormField>
        </div>

        <FormField
          label="Middle Name"
          htmlFor="middleName"
          error={errors.middleName?.message}
          description="Optional"
        >
          <Input
            id="middleName"
            placeholder="Michael"
            autoComplete="additional-name"
            error={!!errors.middleName}
            {...register("middleName")}
          />
        </FormField>

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
            autoComplete="email"
            error={!!errors.email}
            {...register("email")}
          />
        </FormField>

        <FormField
          label="Phone Number"
          htmlFor="phone"
          required
          error={errors.phone?.message}
          description="Include country code if outside your region"
        >
          <Input
            id="phone"
            type="tel"
            placeholder="+1 555 123 4567"
            autoComplete="tel"
            error={!!errors.phone}
            {...register("phone")}
          />
        </FormField>

        {isCreatePool ? (
          <FormField
            label="Country"
            htmlFor="country"
            required
            error={errors.country?.message}
          >
            <ReferenceCountryPicker
              value={country}
              onChange={(code) =>
                setValue("country", code, { shouldValidate: true, shouldDirty: true })
              }
            />
          </FormField>
        ) : null}

        <FormField
          label="Password"
          htmlFor="password"
          required
          error={errors.password?.message}
          description="Min 8 characters with uppercase, lowercase, and a number"
        >
          <PasswordInput
            id="password"
            placeholder="••••••••"
            autoComplete="new-password"
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
          <PasswordInput
            id="confirmPassword"
            placeholder="••••••••"
            autoComplete="new-password"
            error={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
        </FormField>

        <FormField error={errors.acceptTerms?.message}>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-input"
              {...register("acceptTerms")}
            />
            <span className="text-sm text-navy-600">
              I agree to the{" "}
              <Link href="/terms" className="text-royal-600 hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-royal-600 hover:underline">
                Privacy Policy
              </Link>
            </span>
          </label>
        </FormField>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          isLoading={isSubmitting}
        >
          Create Account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-navy-500">
        Already have an account?{" "}
        <Link
          href={ROUTES.login}
          className="font-medium text-royal-600 hover:text-royal-700"
        >
          Sign In
        </Link>
      </p>
    </div>
  );
}
