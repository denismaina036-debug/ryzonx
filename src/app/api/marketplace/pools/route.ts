import { NextResponse } from "next/server";
import { marketplaceService } from "@/services/marketplace.service";
import type { MarketplaceFilters } from "@/domain/marketplace/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters: MarketplaceFilters = {
      search: searchParams.get("search") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      manager: searchParams.get("manager") ?? undefined,
      securityRating: searchParams.get("securityRating") ?? undefined,
      aggressiveness: searchParams.get("aggressiveness") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
      capacityStatus: searchParams.get("capacityStatus") ?? undefined,
      poolHealth: searchParams.get("poolHealth") ?? undefined,
    };

    const minInv = searchParams.get("minInvestmentMax");
    if (minInv) filters.minInvestmentMax = Number(minInv);

    const pools = await marketplaceService.getMarketplacePools(filters);
    return NextResponse.json({ pools });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load marketplace";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
