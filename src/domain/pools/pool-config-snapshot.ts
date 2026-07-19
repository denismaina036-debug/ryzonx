import type { ReturnTier } from "@/features/investor/types/account";
import type { ManagedPoolConfig, ManagedPoolVisibility } from "@/domain/pools/managed-pool";

export interface PoolConfigSnapshot {
  version: number;
  capturedAt: string;
  strategyId: string;
  pool: {
    name: string;
    slug: string;
    description: string;
    poolDescription: string;
    coverImageUrl: string | null;
    cardBackgroundColor: string | null;
    tagline: string | null;
    marketsTraded: string[];
    minInvestment: number;
    maxInvestment: number | null;
    targetCapital: number | null;
    maxInvestorsCap: number | null;
    poolDurationDays: number | null;
    profitTargetPct: number | null;
    returnTiers: ReturnTier[];
    aggressivenessLevel: string | null;
    riskSummary: string | null;
    visibility: ManagedPoolVisibility | string;
    isInviteOnly: boolean;
    hideFromMarketplace: boolean;
  };
  managedPool: ManagedPoolConfig;
}

function readManagedConfig(poolFaq: unknown): ManagedPoolConfig {
  if (!poolFaq || typeof poolFaq !== "object" || Array.isArray(poolFaq)) return {};
  const faq = poolFaq as { managedPool?: ManagedPoolConfig };
  return faq.managedPool ?? {};
}

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

/** Build an immutable snapshot from a live `funds` row at cycle creation time. */
export function buildPoolConfigSnapshot(
  row: Record<string, unknown>,
  strategyId: string,
  version: number
): PoolConfigSnapshot {
  const managedPool = readManagedConfig(row.pool_faq);
  const returnTiersRaw = row.return_tiers;
  const returnTiers = Array.isArray(returnTiersRaw)
    ? (returnTiersRaw as ReturnTier[])
    : [];

  const visibility =
    managedPool.visibility ??
    (row.hide_from_marketplace ? "private" : row.is_invite_only ? "invite_only" : "public");

  return {
    version,
    capturedAt: new Date().toISOString(),
    strategyId,
    pool: {
      name: (row.name as string) ?? "",
      slug: (row.slug as string) ?? "",
      description: (row.description as string) ?? "",
      poolDescription: (row.pool_description as string) ?? (row.description as string) ?? "",
      coverImageUrl: (row.cover_image_url as string | null) ?? null,
      cardBackgroundColor: (row.card_background_color as string | null) ?? null,
      tagline: (row.tagline as string | null) ?? null,
      marketsTraded: Array.isArray(row.markets_traded)
        ? (row.markets_traded as string[])
        : [],
      minInvestment: toNumber(row.min_investment as number | null),
      maxInvestment:
        row.max_investment != null ? toNumber(row.max_investment as number) : null,
      targetCapital:
        row.target_capital != null ? toNumber(row.target_capital as number) : null,
      maxInvestorsCap:
        row.max_investors_cap != null ? toNumber(row.max_investors_cap as number) : null,
      poolDurationDays: (row.pool_duration_days as number | null) ?? null,
      profitTargetPct:
        row.profit_target_pct != null ? toNumber(row.profit_target_pct as number) : null,
      returnTiers,
      aggressivenessLevel: (row.aggressiveness_level as string | null) ?? null,
      riskSummary: (row.risk_summary as string | null) ?? null,
      visibility,
      isInviteOnly: Boolean(row.is_invite_only),
      hideFromMarketplace: Boolean(row.hide_from_marketplace),
    },
    managedPool,
  };
}
