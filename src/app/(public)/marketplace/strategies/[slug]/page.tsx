import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { InvestorPageContent } from "@/components/layouts/investor-page-content";
import { StrategyDetailView } from "@/features/marketplace/components/strategy-detail-view";
import { BRAND_NAME } from "@/constants/brand";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { ROUTES } from "@/constants/routes";
import { marketplacePresentationService } from "@/services/marketplace-presentation.service";
import { strategyIntelligenceService } from "@/services/strategy-intelligence.service";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await marketplacePresentationService.getStrategyPageData(slug);
  if (!data) {
    return buildPageMetadata({
      title: "Strategy Not Found",
      description: "This investment strategy could not be found on RyvonX.",
      path: `${ROUTES.marketplaceStrategies}/${slug}`,
      robots: { index: false, follow: false },
    });
  }

  const { strategy, manager } = data;
  const description =
    strategy.description ??
    `${strategy.name} — an approved investment strategy by ${manager.name} on ${BRAND_NAME}.`;

  return buildPageMetadata({
    title: strategy.name,
    description,
    path: `${ROUTES.marketplaceStrategies}/${slug}`,
    keywords: [strategy.name, manager.name, "investment strategy", BRAND_NAME],
  });
}

export default async function MarketplaceStrategyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await marketplacePresentationService.getStrategyPageData(slug);
  if (!data) notFound();

  const intelligence = await strategyIntelligenceService.getForStrategySlug(slug);

  return (
    <InvestorPageContent wide>
      <StrategyDetailView
        strategy={data.strategy}
        cycles={data.cycles}
        manager={data.manager}
        relatedStrategies={data.relatedStrategies}
        intelligence={intelligence}
      />
    </InvestorPageContent>
  );
}
