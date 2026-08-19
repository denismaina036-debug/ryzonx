import type { ManagedPoolConfig, ManagedPoolVisibility } from "@/domain/pools/managed-pool";
import type { ReturnDurationPreset, ReturnDurationUnit } from "@/domain/roi/types";

export interface PoolConfigSnapshotRoiMultiplier {
  investmentLevelId: string;
  multiplier: number;
}

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
    /** PM-set starting capital for this cycle (before investor allocations). */
    initialRaisedCapital: number | null;
    maxInvestorsCap: number | null;
    poolDurationDays: number | null;
    profitTargetPct: number | null;
    returnDurationPreset: ReturnDurationPreset | null;
    returnDurationValue: number | null;
    returnDurationUnit: ReturnDurationUnit | null;
    roiMultipliers: PoolConfigSnapshotRoiMultiplier[];
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
  version: number,
  roiMultipliers: PoolConfigSnapshotRoiMultiplier[] = []
): PoolConfigSnapshot {
  const managedPool = readManagedConfig(row.pool_faq);

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
      initialRaisedCapital: null,
      maxInvestorsCap:
        row.max_investors_cap != null ? toNumber(row.max_investors_cap as number) : null,
      poolDurationDays: (row.pool_duration_days as number | null) ?? null,
      profitTargetPct:
        row.profit_target_pct != null ? toNumber(row.profit_target_pct as number) : null,
      returnDurationPreset: (row.return_duration_preset as ReturnDurationPreset | null) ?? null,
      returnDurationValue: (row.return_duration_value as number | null) ?? null,
      returnDurationUnit: (row.return_duration_unit as ReturnDurationUnit | null) ?? null,
      roiMultipliers,
      aggressivenessLevel: (row.aggressiveness_level as string | null) ?? null,
      riskSummary: (row.risk_summary as string | null) ?? null,
      visibility,
      isInviteOnly: Boolean(row.is_invite_only),
      hideFromMarketplace: Boolean(row.hide_from_marketplace),
    },
    managedPool,
  };
}

export interface CycleSnapshotOverrides {
  minInvestment?: number | null;
  targetCapital?: number | null;
  initialRaisedCapital?: number | null;
  maxCapacity?: number | null;
  maxInvestorsCap?: number | null;
  poolDurationDays?: number | null;
  returnDurationPreset?: ReturnDurationPreset | null;
  returnDurationValue?: number | null;
  returnDurationUnit?: ReturnDurationUnit | null;
  roiMultipliers?: PoolConfigSnapshotRoiMultiplier[];
}

export function readCycleReturnDuration(
  snapshot: PoolConfigSnapshot | Record<string, unknown> | unknown | null | undefined
): {
  preset: ReturnDurationPreset;
  value: number;
  unit: ReturnDurationUnit;
} | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const pool = (snapshot as PoolConfigSnapshot).pool;
  if (!pool?.returnDurationPreset) return null;
  return {
    preset: pool.returnDurationPreset,
    value: pool.returnDurationValue != null && pool.returnDurationValue > 0
      ? pool.returnDurationValue
      : 1,
    unit: pool.returnDurationUnit ?? "days",
  };
}

export function readCycleInitialRaisedCapital(
  snapshot: PoolConfigSnapshot | Record<string, unknown> | unknown | null | undefined
): number {
  if (!snapshot || typeof snapshot !== "object") return 0;
  const pool = (snapshot as PoolConfigSnapshot).pool;
  if (!pool || typeof pool !== "object") return 0;
  const initial = (pool as { initialRaisedCapital?: number | null }).initialRaisedCapital;
  return initial != null && initial > 0 ? initial : 0;
}

/** Apply cycle-specific funding terms onto a pool snapshot at cycle creation. */
export function applyCycleSnapshotOverrides(
  snapshot: PoolConfigSnapshot,
  overrides: CycleSnapshotOverrides
): PoolConfigSnapshot {
  return {
    ...snapshot,
    pool: {
      ...snapshot.pool,
      minInvestment: overrides.minInvestment ?? snapshot.pool.minInvestment,
      targetCapital: overrides.targetCapital ?? snapshot.pool.targetCapital,
      initialRaisedCapital:
        overrides.initialRaisedCapital !== undefined
          ? overrides.initialRaisedCapital
          : snapshot.pool.initialRaisedCapital,
      maxInvestorsCap: overrides.maxInvestorsCap ?? snapshot.pool.maxInvestorsCap,
      poolDurationDays: overrides.poolDurationDays ?? snapshot.pool.poolDurationDays,
      returnDurationPreset:
        overrides.returnDurationPreset !== undefined
          ? overrides.returnDurationPreset
          : snapshot.pool.returnDurationPreset,
      returnDurationValue:
        overrides.returnDurationValue !== undefined
          ? overrides.returnDurationValue
          : snapshot.pool.returnDurationValue,
      returnDurationUnit:
        overrides.returnDurationUnit !== undefined
          ? overrides.returnDurationUnit
          : snapshot.pool.returnDurationUnit,
      roiMultipliers:
        overrides.roiMultipliers && overrides.roiMultipliers.length > 0
          ? overrides.roiMultipliers
          : snapshot.pool.roiMultipliers,
    },
  };
}
