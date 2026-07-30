import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PoolDetailView } from "@/features/marketplace/components/pool-detail-view";
import { InvestorPageContent } from "@/components/layouts/investor-page-content";
import { BRAND_NAME } from "@/constants/brand";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { marketplacePresentationService } from "@/services/marketplace-presentation.service";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await marketplacePresentationService.getOpportunityPageData(slug);
  if (!data) {
    return buildPageMetadata({
      title: "Pool Not Found",
      description: "This investment pool could not be found on RyvonX.",
      path: `/marketplace/${slug}`,
      robots: { index: false, follow: false },
    });
  }

  const { pool } = data;
  const title = pool.displayPoolName || pool.name;
  const description =
    pool.tagline ||
    pool.poolDescription ||
    `Invest in ${title} on ${BRAND_NAME}. Managed by ${pool.managerName ?? "a verified pool manager"}.`;

  return buildPageMetadata({
    title,
    description,
    path: `/marketplace/${slug}`,
    image: pool.coverImageUrl || pool.logoUrl || undefined,
    imageAlt: `${title} — ${BRAND_NAME} investment pool`,
    keywords: [
      title,
      pool.managerName ?? "",
      "investment pool",
      BRAND_NAME,
      ...pool.categories,
    ].filter(Boolean),
  });
}

export default async function MarketplacePoolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await marketplacePresentationService.getOpportunityPageData(slug);
  if (!data) notFound();

  return (
    <InvestorPageContent wide className="py-2 sm:py-4">
      <PoolDetailView pool={data.pool} />
    </InvestorPageContent>
  );
}
