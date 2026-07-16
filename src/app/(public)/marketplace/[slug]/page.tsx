import { notFound } from "next/navigation";
import { marketplaceService } from "@/services/marketplace.service";
import { PoolDetailView } from "@/features/marketplace/components/pool-detail-view";
import { InvestorPageContent } from "@/components/layouts/investor-page-content";
export default async function MarketplacePoolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pool = await marketplaceService.getPoolBySlug(slug);
  if (!pool) notFound();

  const [performance, journal, investorStats, activity, allPools] = await Promise.all([
    marketplaceService.getPerformanceAnalytics(pool.id),
    marketplaceService.getPublicJournal(pool.id),
    marketplaceService.getInvestorStats(pool.id),
    marketplaceService.getRecentActivity(pool.id),
    marketplaceService.getMarketplacePools(),
  ]);

  const relatedPools = allPools.filter((p) => p.id !== pool.id).slice(0, 2);

  return (
    <InvestorPageContent wide className="py-2 sm:py-4">
      <PoolDetailView        pool={pool}
        performance={performance}
        journal={journal}
        investorStats={investorStats}
        activity={activity}
        relatedPools={relatedPools}
      />
    </InvestorPageContent>
  );
}