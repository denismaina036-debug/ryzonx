import type { ReturnTier } from "@/features/investor/types/account";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

export function projectedReturnPct(amount: number, tiers: ReturnTier[]): number | null {
  if (!tiers.length) return null;
  const match = tiers.find((t) => {
    const min = toNumber(t.minAmount);
    const max = t.maxAmount != null ? toNumber(t.maxAmount) : Infinity;
    return amount >= min && amount <= max;
  });
  return match ? toNumber(match.returnPct) : null;
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
