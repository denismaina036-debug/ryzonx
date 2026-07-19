import { CANONICAL_SITE_URL } from "@/constants/site";
import { env } from "@/lib/env";

/** Application base URL without trailing slash. */
export function getAppBaseUrl(): string {
  return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
}

/** Build an absolute app URL from a path. */
export function appUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getAppBaseUrl()}${normalized}`;
}

export function getAuthCallbackUrl(): string {
  return appUrl("/auth/callback");
}

export function getResetPasswordUrl(): string {
  return appUrl("/reset-password");
}

export function getVerifyEmailUrl(): string {
  return appUrl("/verify-email");
}

/** Metadata / SSR fallback when env is unavailable at build time. */
export function resolveMetadataBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return fromEnv || CANONICAL_SITE_URL;
}
