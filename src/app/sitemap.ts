import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { CANONICAL_SITE_URL } from "@/constants/site";
import { ROUTES } from "@/constants/routes";

const STATIC_PATHS = [
  ROUTES.home,
  ROUTES.marketplace,
  ROUTES.performance,
  ROUTES.journal,
  ROUTES.investors,
  ROUTES.howItWorks,
  ROUTES.faq,
  ROUTES.contact,
  ROUTES.activity,
  "/privacy",
  "/terms",
] as const;

async function getListedPoolSlugs(): Promise<string[]> {
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("funds")
      .select("slug")
      .eq("is_marketplace_listed", true)
      .eq("lifecycle_status", "live")
      .eq("status", "active");

    if (error) return [];
    return (data ?? [])
      .map((row) => (row as { slug?: string }).slug)
      .filter((slug): slug is string => Boolean(slug));
  } catch {
    return [];
  }
}

async function getPublishedLegalSlugs(): Promise<string[]> {
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("legal_documents")
      .select("slug")
      .eq("status", "published");

    if (error) return [];
    return (data ?? [])
      .map((row) => (row as { slug?: string }).slug)
      .filter((slug): slug is string => Boolean(slug));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [poolSlugs, legalSlugs] = await Promise.all([
    getListedPoolSlugs(),
    getPublishedLegalSlugs(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${CANONICAL_SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === ROUTES.home || path === ROUTES.marketplace ? "daily" : "weekly",
    priority: path === ROUTES.home ? 1 : path === ROUTES.marketplace ? 0.9 : 0.7,
  }));

  const poolEntries: MetadataRoute.Sitemap = poolSlugs.map((slug) => ({
    url: `${CANONICAL_SITE_URL}/marketplace/${slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const legalEntries: MetadataRoute.Sitemap = legalSlugs
    .filter((slug) => slug !== "privacy" && slug !== "terms")
    .map((slug) => ({
      url: `${CANONICAL_SITE_URL}/${slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    }));

  return [...staticEntries, ...poolEntries, ...legalEntries];
}
