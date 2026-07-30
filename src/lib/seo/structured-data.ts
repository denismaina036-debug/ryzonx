import {
  BRAND_DESCRIPTION,
  BRAND_ORGANIZATION_LOGO_URL,
  BRAND_NAME,
  BRAND_OG_IMAGE_URL,
  BRAND_SOCIAL_PROFILES,
  BRAND_SUPPORT_EMAIL,
} from "@/constants/brand";
import { CANONICAL_SITE_URL } from "@/constants/site";

export interface JsonLd {
  "@context": "https://schema.org";
  "@type": string;
  [key: string]: unknown;
}

export function getOrganizationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${CANONICAL_SITE_URL}/#organization`,
    name: BRAND_NAME,
    legalName: BRAND_NAME,
    url: CANONICAL_SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: BRAND_ORGANIZATION_LOGO_URL,
      contentUrl: BRAND_ORGANIZATION_LOGO_URL,
      width: 512,
      height: 512,
      caption: `${BRAND_NAME} logo`,
    },
    image: BRAND_OG_IMAGE_URL,
    description: BRAND_DESCRIPTION,
    email: BRAND_SUPPORT_EMAIL,
    brand: {
      "@type": "Brand",
      name: BRAND_NAME,
      logo: BRAND_ORGANIZATION_LOGO_URL,
    },
    sameAs: [...BRAND_SOCIAL_PROFILES],
  };
}

export function getWebSiteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${CANONICAL_SITE_URL}/#website`,
    name: BRAND_NAME,
    url: CANONICAL_SITE_URL,
    description: BRAND_DESCRIPTION,
    inLanguage: "en-US",
    publisher: {
      "@id": `${CANONICAL_SITE_URL}/#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${CANONICAL_SITE_URL}/marketplace?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function getSiteStructuredData(): JsonLd[] {
  return [getOrganizationJsonLd(), getWebSiteJsonLd()];
}
