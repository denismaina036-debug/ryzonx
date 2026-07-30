import type { Metadata } from "next";
import { MarketplaceBrowse } from "@/features/marketplace/components/marketplace-browse";
import { InvestorPageContent } from "@/components/layouts/investor-page-content";
import { ROUTES } from "@/constants/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { marketplacePresentationService } from "@/services/marketplace-presentation.service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Marketplace",
  description:
    "Discover verified investment pools on RyvonX. Browse pool managers, compare performance, and invest alongside skilled traders.",
  path: ROUTES.marketplace,
  keywords: [
    "investment pool marketplace",
    "verified traders",
    "pool trading",
    "RyvonX marketplace",
  ],
});

export default async function MarketplacePage() {
  const { pools, managers, featuredManagerSections, strategies, cycles } =
    await marketplacePresentationService.getLandingPageData();

  return (
    <InvestorPageContent wide className="py-1 sm:py-4">
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
