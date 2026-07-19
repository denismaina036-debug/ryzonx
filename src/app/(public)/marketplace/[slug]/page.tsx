import { notFound } from "next/navigation";
import { PoolDetailView } from "@/features/marketplace/components/pool-detail-view";
import { InvestorPageContent } from "@/components/layouts/investor-page-content";
import { marketplacePresentationService } from "@/services/marketplace-presentation.service";

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
      <PoolDetailView
        pool={data.pool}
        performance={data.performance}
        journal={data.journal}
        investorStats={data.investorStats}
        activity={data.activity}
        relatedPools={data.relatedPools}
      />
    </InvestorPageContent>
  );
}
