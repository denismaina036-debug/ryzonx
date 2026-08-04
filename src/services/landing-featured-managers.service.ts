import { cache } from "react";
import { marketplaceService } from "@/services/marketplace.service";
import { rankFeaturedLandingPoolManagers } from "@/lib/landing-page/featured-manager-ranking";
import type { FeaturedLandingPoolManager } from "@/domain/landing-page/types";

export const landingFeaturedManagersService = {
  getTopManagers: cache(async (limit = 5): Promise<FeaturedLandingPoolManager[]> => {
    const managers = await marketplaceService.getMarketplaceManagers();
    return rankFeaturedLandingPoolManagers(managers, limit);
  }),
};
