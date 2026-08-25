import type { Metadata } from "next";
import {
  BRAND_DESCRIPTION,
  BRAND_KEYWORDS,
  BRAND_LOCALE,
  BRAND_NAME,
  BRAND_OG_IMAGE_PATH,
  BRAND_THEME_COLOR,
  TWITTER_CREATOR,
  TWITTER_SITE,
  brandAssetUrl,
} from "@/constants/brand";
import { CANONICAL_SITE_URL } from "@/constants/site";
import { resolveMetadataBaseUrl } from "@/lib/app-url";

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

export const ROOT_SITE_METADATA: Metadata = {
  metadataBase: new URL(resolveMetadataBaseUrl()),
  applicationName: BRAND_NAME,
  authors: [{ name: BRAND_NAME, url: CANONICAL_SITE_URL }],
  creator: BRAND_NAME,
  publisher: BRAND_NAME,
  category: "Finance",
  keywords: [...BRAND_KEYWORDS],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [
      {
        rel: "mask-icon",
        url: "/images/logo.png",
      },
    ],
  },
  manifest: "/site.webmanifest",
  other: {
    "msapplication-TileColor": BRAND_THEME_COLOR,
  },
};

export interface PageMetadataInput {
  title: string;
  description?: string;
  /** Site-relative path, e.g. `/marketplace`. */
  path: string;
  keywords?: string[];
  image?: string;
  imageAlt?: string;
  type?: "website" | "article";
  robots?: Metadata["robots"];
  /** When true, title is used as-is (no template suffix). */
  absoluteTitle?: boolean;
}

function resolveImage(image?: string) {
  const path = image ?? BRAND_OG_IMAGE_PATH;
  const url = path.startsWith("http") ? path : brandAssetUrl(path);
  return {
    url,
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    alt: `${BRAND_NAME} — investment pool marketplace`,
  };
}

/** Build production-ready metadata for a public page. */
export function buildPageMetadata(input: PageMetadataInput): Metadata {
  const description = input.description ?? BRAND_DESCRIPTION;
  const canonical = brandAssetUrl(input.path);
  const ogImage = resolveImage(input.image);
  const keywords = input.keywords?.length
    ? input.keywords
    : [...BRAND_KEYWORDS];

  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description,
    keywords,
    alternates: {
      canonical,
      languages: {
        "en-US": canonical,
      },
    },
    robots: input.robots,
    openGraph: {
      type: input.type ?? "website",
      locale: BRAND_LOCALE,
      url: canonical,
      siteName: BRAND_NAME,
      title: input.title,
      description,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      site: TWITTER_SITE,
      creator: TWITTER_CREATOR,
      title: input.title,
      description,
      images: [ogImage.url],
    },
  };
}

/** Auth and utility pages that should not be indexed. */
export function buildNoIndexMetadata(input: Omit<PageMetadataInput, "robots">): Metadata {
  return buildPageMetadata({
    ...input,
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    },
  });
}
