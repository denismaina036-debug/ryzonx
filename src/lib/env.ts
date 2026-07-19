import { z } from "zod";
import { CANONICAL_SITE_URL } from "@/constants/site";

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const clientSchema = z
  .object({
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_APP_NAME: z.string().min(1),
    NEXT_PUBLIC_APP_ENV: z.enum(["development", "staging", "production"]),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_ENABLE_REGISTRATION: z
      .string()
      .optional()
      .transform((v) => v !== "false"),
    NEXT_PUBLIC_ENABLE_DEPOSITS: z
      .string()
      .optional()
      .transform((v) => v !== "false"),
    NEXT_PUBLIC_ENABLE_WITHDRAWALS: z
      .string()
      .optional()
      .transform((v) => v !== "false"),
  })
  .superRefine((data, ctx) => {
    if (data.NEXT_PUBLIC_APP_ENV !== "production") return;
    const normalized = data.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    if (normalized !== CANONICAL_SITE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `NEXT_PUBLIC_APP_URL must be ${CANONICAL_SITE_URL} in production`,
        path: ["NEXT_PUBLIC_APP_URL"],
      });
    }
  });

function getEnv(): z.infer<typeof clientSchema> {
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_ENABLE_REGISTRATION:
      process.env.NEXT_PUBLIC_ENABLE_REGISTRATION,
    NEXT_PUBLIC_ENABLE_DEPOSITS: process.env.NEXT_PUBLIC_ENABLE_DEPOSITS,
    NEXT_PUBLIC_ENABLE_WITHDRAWALS:
      process.env.NEXT_PUBLIC_ENABLE_WITHDRAWALS,
  });

  if (!parsed.success) {
    console.error(
      "❌ Invalid client environment variables:",
      parsed.error.flatten().fieldErrors
    );
    throw new Error("Invalid client environment variables");
  }

  return parsed.data;
}

function getServerEnv(): z.infer<typeof serverSchema> {
  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!parsed.success) {
    console.error(
      "❌ Invalid server environment variables:",
      parsed.error.flatten().fieldErrors
    );
    throw new Error("Invalid server environment variables");
  }

  return parsed.data;
}

export const env = getEnv();

export function getServerEnvSafe(): z.infer<typeof serverSchema> | null {
  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  return parsed.success ? parsed.data : null;
}

export { getServerEnv };
