import { copyTraderName, copyTradingText } from "@/lib/copy-trading-presentation";
import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PoolDetailView } from "@/features/marketplace/components/pool-detail-view";
import { InvestorPageContent } from "@/components/layouts/investor-page-content";
import { BRAND_NAME } from "@/constants/brand";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { marketplacePresentationService } from "@/services/marketplace-presentation.service";

export const dynamic = "force-dynamic";

const getOpportunityPageData = cache((slug: string) =>
  marketplacePresentationService.getOpportunityPageData(slug)
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getOpportunityPageData(slug);
  if (!data) {
    return buildPageMetadata({
      title: "Strategy Not Found",
      description: "This copy-trading strategy could not be found on RyvonX.",
      path: `/marketplace/${slug}`,
      robots: { index: false, follow: false },
    });
  }

  const { pool } = data;
  const title = copyTraderName(pool);
  const description =
    pool.tagline ||
    pool.poolDescription ||
    `Copy ${title} on ${BRAND_NAME}. Trader ${pool.managerName ?? "a verified trader"}.`;

  return buildPageMetadata({
    title,
    description: copyTradingText(description),
    path: `/marketplace/${slug}`,
    image: pool.coverImageUrl || pool.logoUrl || undefined,
    imageAlt: `${title} — ${BRAND_NAME} copy-trading strategy`,
    keywords: [
      title,
      pool.managerName ?? "",
      "copy-trading strategy",
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
  const data = await getOpportunityPageData(slug);
  if (!data) notFound();

  return (
    <InvestorPageContent wide className="py-2 sm:py-4">
      <PoolDetailView pool={data.pool} />
    </InvestorPageContent>
  );
}
