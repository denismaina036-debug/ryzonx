import "server-only";
import { marketplaceService } from "@/services/marketplace.service";
import { readCatalogue } from "@/services/trading/repository";
import { searchExisting, searchMarkets, type SearchResult } from "@/domain/search/unified-search";

let cached: { expires: number; results: SearchResult[] } | undefined;
let pending: Promise<SearchResult[]> | undefined;
async function existingIndex(): Promise<SearchResult[]> {
  if (cached && cached.expires > Date.now()) return cached.results;
  if (pending) return pending;
  pending = marketplaceService.getMarketplacePools().then(pools => {
    // Reuse the existing public-listing and identity filters. No private profiles.
    const results: SearchResult[] = pools.map(p => ({ id: p.id, kind: "pools", label: p.displayPoolName || p.name, detail: p.managerName ?? "Investment pool", href: `/marketplace/${encodeURIComponent(p.slug)}` }));
    const managers = new Map<string, SearchResult>();
    for (const pool of pools) {
      if (pool.managerSlug && pool.managerName) managers.set(pool.managerSlug, { id: pool.managerSlug, kind: "managers", label: pool.managerName, detail: pool.tradingStyle ?? "Pool manager", href: `/managers/${encodeURIComponent(pool.managerSlug)}` });
    }
    results.push(...managers.values());
    cached = { expires: Date.now() + 60_000, results };
    return results;
  }).finally(() => { pending = undefined; });
  return pending;
}
export async function unifiedSearch(query: string) {
  // A slow legacy source must not prevent catalogue search from returning.
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const legacy = Promise.race([existingIndex(), new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("Search source unavailable")), 4000); })]).finally(() => clearTimeout(timeout));
  const [catalogue, existing] = await Promise.allSettled([readCatalogue(), legacy]);
  const markets = catalogue.status === "fulfilled" ? searchMarkets(catalogue.value.instruments.filter(i => i.asset_class !== "futures" && catalogue.value.classes.some(c => c.asset_class === i.asset_class && c.enabled)), query) : [];
  return { results: [...markets, ...(existing.status === "fulfilled" ? searchExisting(existing.value, query) : [])], partial: existing.status === "rejected" || catalogue.status === "rejected" || !catalogue.value.ready };
}
