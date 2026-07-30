import type { ReturnTier } from "@/features/investor/types/account";
import type { PlatformInvestmentLevel, PoolRoiMultiplier } from "@/domain/roi/types";
import { resolveInvestmentLevel, resolveMultiplier } from "@/domain/roi/calculator";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

/** @deprecated Use resolveRoiMultiplier instead. */
export function projectedReturnPct(amount: number, tiers: ReturnTier[]): number | null {
  if (!tiers.length) return null;
  const match = tiers.find((t) => {
    const min = toNumber(t.minAmount);
    const max = t.maxAmount != null ? toNumber(t.maxAmount) : Infinity;
    return amount >= min && amount <= max;
  });
  return match ? toNumber(match.returnPct) : null;
}

/** ROI v2 — returns projected multiplier for an investment amount. */
export function resolveRoiMultiplier(
  amount: number,
  levels: PlatformInvestmentLevel[],
  multipliers: PoolRoiMultiplier[]
): number | null {
  const level = resolveInvestmentLevel(amount, levels);
  if (!level) return null;
  return resolveMultiplier(level.id, multipliers);
}

/** Display percentage derived from multiplier (e.g. 2.0× → 100%). */
export function multiplierToDisplayPct(multiplier: number | null): number | null {
  if (multiplier == null) return null;
  return Math.round((multiplier - 1) * 100);
}

export interface ParticipatablePool {
  id: string;
  name: string;
  description: string;
  poolDescription: string;
  tradingPair: string;
  poolDurationDays: number | null;
  minInvestment: number;
  maxInvestment: number | null;
  targetCapital: number;
  currentCapital: number;
  profitTargetPct: number;
  targetInvestors: number;
  currentRoi: number;
  returnTiers: ReturnTier[];
  isInviteOnly: boolean;
  isInvited: boolean;
  cardBackgroundColor: string | null;
  poolManagerName: string | null;
  poolManagerIconUrl: string | null;
  status: string;
}

export interface PoolParticipationPageData {
  availableBalance: number;
  pools: ParticipatablePool[];
}
