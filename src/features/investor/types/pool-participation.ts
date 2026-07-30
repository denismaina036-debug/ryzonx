import type { PlatformInvestmentLevel, PoolRoiMultiplier } from "@/domain/roi/types";
import { resolveInvestmentLevel, resolveMultiplier } from "@/domain/roi/calculator";

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
