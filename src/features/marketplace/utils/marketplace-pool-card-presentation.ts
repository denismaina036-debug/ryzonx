import type { InvestmentCycleStatus } from "@/constants/investment-cycle";
import { INVESTMENT_CYCLE_STATUS_LABELS } from "@/constants/investment-cycle";
import { AGGRESSIVENESS_LABELS, CAPACITY_STATUS_LABELS } from "@/constants/marketplace";
import type { MarketplacePoolCard } from "@/domain/marketplace/types";
import type { PlatformInvestmentLevel, PoolRoiMultiplier } from "@/domain/roi/types";
import { formatMultiplier } from "@/domain/roi/calculator";
import { formatPayoutDurationLabel } from "@/domain/pools/payout-duration";
import { formatInstrumentTicker } from "@/domain/reference-data/instrument-display";

export interface PoolCardRoiEntry {
  levelId: string;
  name: string;
  multiplier: number;
  multiplierLabel: string;
  sortOrder: number;
}

/** Resolve ROI multiplier rows for marketplace card display. */
export function resolvePoolCardRoiEntries(pool: MarketplacePoolCard): PoolCardRoiEntry[] {
  const levels = pool.investmentLevels ?? [];
  const multipliers = pool.roiMultipliers ?? [];
  if (multipliers.length === 0 && levels.length === 0) return [];

  const levelMap = new Map(levels.map((level) => [level.id, level]));

  const entries = multipliers
    .map((entry) => {
      const level =
        entry.level ?? levelMap.get(entry.investmentLevelId) ?? null;
      const name = level?.name ?? "Level";
      const multiplier = entry.multiplier;
      return {
        levelId: entry.investmentLevelId,
        name,
        multiplier,
        multiplierLabel: formatMultiplier(multiplier),
        sortOrder: level?.sortOrder ?? 999,
      };
    })
    .filter((entry) => Number.isFinite(entry.multiplier) && entry.multiplier > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (entries.length > 0) return entries;

  return levels
    .filter((level) => level.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((level) => ({
      levelId: level.id,
      name: level.name,
      multiplier: 0,
      multiplierLabel: "—",
      sortOrder: level.sortOrder,
    }));
}

export function formatRaisedCapitalPct(raised: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((raised / target) * 10000) / 100;
}

export function attachRoiToPoolCard(
  pool: MarketplacePoolCard,
  investmentLevels: PlatformInvestmentLevel[],
  multipliers: PoolRoiMultiplier[]
): MarketplacePoolCard {
  const levelMap = new Map(investmentLevels.map((level) => [level.id, level]));
  return {
    ...pool,
    investmentLevels,
    roiMultipliers: multipliers.map((entry) => ({
      ...entry,
      level: entry.level ?? levelMap.get(entry.investmentLevelId),
    })),
  };
}

export function formatExpectedDurationLabel(
  durationDays: number | null,
  durationUnit: string | null | undefined,
  payoutDurationPreset?: string | null
): string {
  return formatPayoutDurationLabel({
    payoutDurationPreset,
    durationDays,
    durationUnit,
  });
}

export { formatPayoutDurationLabel };

export function formatRiskLevelTag(aggressivenessLevel: string | null | undefined): string | null {
  if (!aggressivenessLevel) return null;
  const label = AGGRESSIVENESS_LABELS[aggressivenessLevel] ?? aggressivenessLevel;
  return `${label} Risk`;
}

export function formatPoolLevelLabel(capacityStatus: string): string {
  return CAPACITY_STATUS_LABELS[capacityStatus] ?? capacityStatus;
}

export function formatCycleStatusLabel(status: InvestmentCycleStatus | null | undefined): string {
  if (!status) return "—";
  return INVESTMENT_CYCLE_STATUS_LABELS[status] ?? status;
}

export function resolveTradingAssetLabel(input: {
  tradingInstrumentCode?: string | null;
  tradingPair?: string | null;
}): string {
  const ticker = formatInstrumentTicker(
    input.tradingInstrumentCode ?? input.tradingPair,
    null
  );
  if (ticker !== "—") return ticker;

  const pair = input.tradingPair?.trim();
  if (pair && pair !== "Multi-asset") {
    return formatInstrumentTicker(pair, pair);
  }

  return "—";
}

export function participantIndicatorCount(participantCount: number): number {
  return Math.min(Math.max(participantCount, 0), 5);
}

/** Remove leading instrument symbol from pool name for public display. */
export function stripInstrumentFromPoolName(
  name: string,
  instrumentCode?: string | null
): string {
  const trimmed = name.trim();
  if (!instrumentCode?.trim()) return trimmed;

  const code = instrumentCode.trim().toUpperCase();
  const upper = trimmed.toUpperCase();
  if (upper.startsWith(code)) {
    return trimmed.slice(code.length).trim().replace(/^[-–—:\s]+/, "") || trimmed;
  }
  return trimmed;
}

/** Pre-platform admin baseline plus live platform-recorded totals. */
export function resolvePublicDisplayCount(seed: number, live: number): number {
  const safeSeed = Number.isFinite(seed) ? Math.max(0, seed) : 0;
  const safeLive = Number.isFinite(live) ? Math.max(0, live) : 0;
  if (safeSeed === 0) return safeLive;
  return safeSeed + safeLive;
}

export interface MobilePoolBannerPresentation {
  title: string;
  categoryPill: string | null;
  instrumentsLabel: string | null;
}

/** Minimal instrument line for mobile pool card banners. */
export function resolveMobilePoolBannerPresentation(
  pool: Pick<
    MarketplacePoolCard,
    "name" | "displayPoolName" | "marketsTraded" | "tradingPair" | "tradingAssetTag" | "categories"
  >
): MobilePoolBannerPresentation {
  const title = (pool.displayPoolName || pool.name).trim().toUpperCase();
  const tickers = collectPoolInstrumentTickers(pool);
  const multiAssetCategory = pool.categories.includes("multi_asset");
  const multiPairLabel = isMultiAssetPairLabel(pool.tradingPair);
  const forexCategory = pool.categories.includes("forex");

  if (tickers.length > 1) {
    const shown = tickers.slice(0, 2);
    const suffix = tickers.length > 2 ? "..." : "";
    return {
      title,
      categoryPill: "MULTIPLE ASSETS",
      instrumentsLabel: `${shown.join(", ")}${suffix}`,
    };
  }

  if (multiAssetCategory || multiPairLabel) {
    return {
      title,
      categoryPill: "MULTI-ASSET",
      instrumentsLabel: tickers[0] ?? null,
    };
  }

  if (tickers.length === 1) {
    return {
      title,
      categoryPill: null,
      instrumentsLabel: tickers[0] ?? null,
    };
  }

  if (forexCategory) {
    return {
      title,
      categoryPill: "FOREX",
      instrumentsLabel: "Major Pairs",
    };
  }

  return { title, categoryPill: null, instrumentsLabel: null };
}

function collectPoolInstrumentTickers(
  pool: Pick<
    MarketplacePoolCard,
    "marketsTraded" | "tradingPair" | "tradingAssetTag"
  >
): string[] {
  const tickers = new Set<string>();

  for (const entry of pool.marketsTraded) {
    const trimmed = entry.trim();
    if (!trimmed || !looksLikeInstrumentReference(trimmed)) continue;
    const ticker = formatInstrumentTicker(trimmed, null);
    if (isUsableInstrumentTicker(ticker)) tickers.add(ticker);
  }

  if (!isMultiAssetPairLabel(pool.tradingPair)) {
    const pairTicker = formatInstrumentTicker(pool.tradingPair, null);
    if (isUsableInstrumentTicker(pairTicker)) tickers.add(pairTicker);
  }

  if (pool.tradingAssetTag && isUsableInstrumentTicker(pool.tradingAssetTag)) {
    tickers.add(pool.tradingAssetTag.trim().toUpperCase());
  }

  return Array.from(tickers);
}

function looksLikeInstrumentReference(value: string): boolean {
  if (value.includes(":")) return true;
  if (/^[a-z0-9]+_[a-z0-9]+$/i.test(value)) return true;
  return formatInstrumentTicker(value, null) !== "—" && !isMarketCategoryLabel(value);
}

function isMultiAssetPairLabel(pair: string | null | undefined): boolean {
  const normalized = pair?.trim().toLowerCase();
  return normalized === "multi-asset" || normalized === "multi asset";
}

const MARKET_CATEGORY_LABELS = new Set([
  "forex",
  "cryptocurrency",
  "crypto",
  "indices",
  "commodities",
  "commodity",
  "stocks",
  "etfs",
  "futures",
  "options",
  "gold",
  "multi_asset",
  "multi asset",
  "multi-asset",
]);

function isMarketCategoryLabel(value: string): boolean {
  return MARKET_CATEGORY_LABELS.has(value.trim().toLowerCase());
}

function isUsableInstrumentTicker(ticker: string): boolean {
  if (!ticker || ticker === "—") return false;
  const upper = ticker.trim().toUpperCase();
  if (isMarketCategoryLabel(upper)) return false;
  if (upper === "MULTIASSET" || upper === "MULTI-ASSET" || upper === "MULTI ASSET") {
    return false;
  }
  return !upper.includes("MAJOR PAIRS");
}

/** Hide taglines that only repeat the pool display name. */
function normalizeLabelForComparison(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function shouldShowPoolTagline(
  tagline: string | null | undefined,
  displayName: string,
  poolName?: string
): boolean {
  const trimmed = tagline?.trim();
  if (!trimmed) return false;

  const normalizedTagline = normalizeLabelForComparison(trimmed);
  const comparableNames = [displayName, poolName]
    .filter((value): value is string => Boolean(value?.trim()))
    .map(normalizeLabelForComparison);

  return !comparableNames.some((name) => name === normalizedTagline);
}

function stripPoolPrefixFromCycleName(rawName: string, prefix: string): string | null {
  const prefixTrimmed = prefix.trim();
  if (!prefixTrimmed) return null;

  const escaped = prefixTrimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const withoutPrefix = rawName
    .replace(new RegExp(`^${escaped}\\s*[:—–-]\\s*`, "i"), "")
    .trim();

  if (!withoutPrefix || withoutPrefix.toLowerCase() === prefixTrimmed.toLowerCase()) {
    return null;
  }

  return withoutPrefix;
}

/** Strip pool prefix from cycle names like "POOL — Cycle 1" when the pool is already shown elsewhere. */
export function formatShortCycleLabel(
  poolDisplayName: string,
  cycle: { cycleNumber: number; name: string } | null | undefined,
  poolName?: string
): string {
  if (!cycle) return "—";

  const cycleNumberLabel = `Cycle ${cycle.cycleNumber}`;
  const raw = cycle.name?.trim() ?? "";
  if (!raw) return cycleNumberLabel;

  const cycleSuffixMatch = raw.match(/\bcycle\s*(\d+)\s*$/i);
  if (cycleSuffixMatch) {
    return `Cycle ${cycleSuffixMatch[1]}`;
  }

  const prefixes = [poolDisplayName, poolName]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim());

  for (const prefix of prefixes) {
    const stripped = stripPoolPrefixFromCycleName(raw, prefix);
    if (stripped) return stripped;
  }

  if (
    prefixes.some((prefix) => raw.toLowerCase() === prefix.toLowerCase()) ||
    raw.toLowerCase() === poolDisplayName.trim().toLowerCase()
  ) {
    return cycleNumberLabel;
  }

  return cycleNumberLabel;
}
