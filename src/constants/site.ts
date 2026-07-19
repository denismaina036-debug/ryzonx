/** Canonical production domain for RyvonX (no trailing slash). */
export const CANONICAL_SITE_URL = "https://ryvonx.com";

export const CANONICAL_SITE_HOST = "ryvonx.com";

export const WWW_SITE_HOST = "www.ryvonx.com";

/** Supabase Auth redirect allow-list for production. */
export const PRODUCTION_AUTH_REDIRECT_URLS = [
  `${CANONICAL_SITE_URL}/auth/callback`,
  `${CANONICAL_SITE_URL}/reset-password`,
  `${CANONICAL_SITE_URL}/verify-email`,
] as const;
