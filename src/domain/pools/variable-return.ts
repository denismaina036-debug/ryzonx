import type { ReturnTier } from "@/features/investor/types/account";

/** Variable Return — tier table + profit split (percentage based). */

export const DEFAULT_VARIABLE_RETURN_TIERS: ReturnTier[] = [
  { minAmount: 100, maxAmount: 499, returnPct: 8 },
  { minAmount: 500, maxAmount: 999, returnPct: 12 },
  { minAmount: 1000, maxAmount: null, returnPct: 18 },
];

export function normalizeVariableReturnTiers(tiers: ReturnTier[]): ReturnTier[] {
  if (!tiers.length) return [...DEFAULT_VARIABLE_RETURN_TIERS];
  return tiers.map((t) => ({
    minAmount: Number(t.minAmount) || 0,
    maxAmount: t.maxAmount != null ? Number(t.maxAmount) : null,
    returnPct: Number(t.returnPct) || 0,
  }));
}

export function validateVariableReturnConfig(input: {
  returnTiers: ReturnTier[];
  investorSharePct: string;
  poolManagerSharePct: string;
}): string | null {
  const tiers = normalizeVariableReturnTiers(input.returnTiers);
  if (tiers.length === 0) {
    return "Add at least one investment tier for Variable Return.";
  }
  for (const tier of tiers) {
    if (tier.minAmount <= 0) return "Each tier minimum investment must be greater than zero.";
    if (tier.returnPct <= 0) return "Each tier must have an Expected Return % greater than zero.";
    if (tier.maxAmount != null && tier.maxAmount < tier.minAmount) {
      return "Maximum investment cannot be less than minimum investment in a tier.";
    }
  }

  const investorShare = Number(input.investorSharePct.trim());
  const pmShare = Number(input.poolManagerSharePct.trim());
  if (!Number.isFinite(investorShare) || !Number.isFinite(pmShare)) {
    return "Investor Share and Pool Manager Share are required for Variable Return.";
  }
  const total = Math.round((investorShare + pmShare) * 100) / 100;
  if (total !== 100) {
    return "Investor and Pool Manager profit shares must total 100%.";
  }

  return null;
}
