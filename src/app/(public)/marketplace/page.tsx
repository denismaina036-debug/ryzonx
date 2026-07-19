import { MarketplaceBrowse } from "@/features/marketplace/components/marketplace-browse";
import { InvestorPageContent } from "@/components/layouts/investor-page-content";
import { marketplacePresentationService } from "@/services/marketplace-presentation.service";

export default async function MarketplacePage() {
  const { pools, managers, featuredManagerSections, strategies, cycles } =
    await marketplacePresentationService.getLandingPageData();

  return (
    <InvestorPageContent wide className="py-2 sm:py-4">
      <MarketplaceBrowse
        managers={managers}
        pools={pools}
        strategies={strategies}
        cycles={cycles}
        featuredManagerSections={featuredManagerSections}
      />
    </InvestorPageContent>
  );
}
