import { notFound } from "next/navigation";
import { InvestorPageContent } from "@/components/layouts/investor-page-content";
import { StrategyDetailView } from "@/features/marketplace/components/strategy-detail-view";
import { marketplacePresentationService } from "@/services/marketplace-presentation.service";
import { strategyIntelligenceService } from "@/services/strategy-intelligence.service";

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
