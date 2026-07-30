import { CANONICAL_SITE_URL } from "@/constants/site";

/** Official public-facing brand name (used in SEO, OG, structured data). */
export const BRAND_NAME = "RyvonX";

export const BRAND_TAGLINE =
  "Where skilled traders manage investment pools and investors discover verified trading professionals.";

export const BRAND_DESCRIPTION =
  "RyvonX is a trusted marketplace where skilled traders manage investment pools while investors discover and invest alongside verified pool managers.";

export const BRAND_KEYWORDS = [
  "RyvonX",
  "investment pools",
  "pool trading",
  "trading marketplace",
  "verified traders",
  "investor marketplace",
  "forex pools",
  "managed trading",
] as const;

/** UI logo used in navbar, footer, and admin shells. */
export const BRAND_LOGO_PATH = "/images/logo.png";

/** Square logo at site root — preferred URL for Organization schema and Google Search. */
export const BRAND_ORGANIZATION_LOGO_PATH = "/logo.png";

/** Open Graph / Twitter card image (1200×630). */
export const BRAND_OG_IMAGE_PATH = "/images/og-image.png";

export const BRAND_THEME_COLOR = "#0f1623";

export const BRAND_LOCALE = "en_US";

export const TWITTER_SITE = "@ryvonx";

export const TWITTER_CREATOR = "@ryvonx";

export const BRAND_SUPPORT_EMAIL = "hello@ryvonx.com";

export const BRAND_SOCIAL_PROFILES = [
  "https://x.com/ryvonx",
  "https://www.linkedin.com/company/ryvonx",
  "https://www.facebook.com/ryvonx",
] as const;

export function brandAssetUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${CANONICAL_SITE_URL}${normalized}`;
}

export const BRAND_LOGO_URL = brandAssetUrl(BRAND_LOGO_PATH);
export const BRAND_ORGANIZATION_LOGO_URL = brandAssetUrl(BRAND_ORGANIZATION_LOGO_PATH);
export const BRAND_OG_IMAGE_URL = brandAssetUrl(BRAND_OG_IMAGE_PATH);
