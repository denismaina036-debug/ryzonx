import { marketplaceService } from "@/services/marketplace.service";
import { MarketplaceBrowse } from "@/features/marketplace/components/marketplace-browse";
import { InvestorPageContent } from "@/components/layouts/investor-page-content";

export default async function MarketplacePage() {
  const [pools, featuredSections] = await Promise.all([
    marketplaceService.getMarketplacePools(),
    marketplaceService.getFeaturedSections(),
  ]);

  return (
    <InvestorPageContent wide className="py-2 sm:py-4">
      <MarketplaceBrowse initialPools={pools} featuredSections={featuredSections} />
    </InvestorPageContent>
  );
}
