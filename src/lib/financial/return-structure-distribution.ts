import type { ReturnTier } from "@/features/investor/types/account";

/**
 * Return Structure Distribution Engine
 *
 * Single source of truth for allocating the Investor Profit Pool among participants.
 * Applies after platform fee and pool manager share have been deducted.
 *
 * Weight formula:
 *   allocationWeight = investmentAmount × returnMultiplier
 *   returnMultiplier = matched tier returnPct / 100 (or 1.0 when no tiers / no match)
 */

export interface ReturnStructureParticipant {
  allocationId: string;
  investorId: string;
  investmentAmount: number;
}

export interface ReturnStructureAllocation {
  allocationId: string;
  investorId: string;
  investmentAmount: number;
  tierReturnPct: number | null;
  returnMultiplier: number;
  tierWeight: number;
  allocationWeight: number;
  allocationPct: number;
  profitShare: number;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

/** Resolve the return tier for an investment amount. */
export function resolveReturnTier(
  investmentAmount: number,
  returnStructure: ReturnTier[]
): ReturnTier | null {
  if (!returnStructure.length || investmentAmount <= 0) return null;

  const match = returnStructure.find((tier) => {
    const min = toNumber(tier.minAmount);
    const max = tier.maxAmount != null ? toNumber(tier.maxAmount) : Infinity;
    return investmentAmount >= min && investmentAmount <= max;
  });

  return match ?? null;
}

/** Return multiplier derived from tier returnPct (e.g. 12% → 0.12). */
export function returnMultiplierFromTier(tier: ReturnTier | null): number {
  if (!tier) return 1;
  const pct = toNumber(tier.returnPct);
  return pct > 0 ? pct / 100 : 1;
}

/** Compute allocation weight for a participant using investment amount and tier multiplier. */
export function computeAllocationWeight(
  investmentAmount: number,
  returnStructure: ReturnTier[]
): {
  tier: ReturnTier | null;
  returnMultiplier: number;
  tierWeight: number;
  allocationWeight: number;
} {
  const tier = resolveReturnTier(investmentAmount, returnStructure);
  const returnMultiplier =
    returnStructure.length > 0 ? returnMultiplierFromTier(tier) : 1;
  const tierWeight = tier ? toNumber(tier.returnPct) : 100;
  const allocationWeight = investmentAmount * returnMultiplier;

  return { tier, returnMultiplier, tierWeight, allocationWeight };
}

/**
 * Distribute the Investor Profit Pool across participants according to the pool's
 * configured Return Structure (investment amount + tier return multipliers).
 */
export function distributeInvestorProfitPool(input: {
  investorProfitPool: number;
  participants: ReturnStructureParticipant[];
  returnStructure: ReturnTier[];
}): ReturnStructureAllocation[] {
  const pool = roundMoney(Math.max(0, input.investorProfitPool));
  if (pool <= 0 || input.participants.length === 0) {
    return input.participants.map((p) => ({
      allocationId: p.allocationId,
      investorId: p.investorId,
      investmentAmount: p.investmentAmount,
      tierReturnPct: null,
      returnMultiplier: 1,
      tierWeight: 100,
      allocationWeight: 0,
      allocationPct: 0,
      profitShare: 0,
    }));
  }

  const weighted = input.participants.map((participant) => {
    const { tier, returnMultiplier, tierWeight, allocationWeight } =
      computeAllocationWeight(participant.investmentAmount, input.returnStructure);

    return {
      participant,
      tierReturnPct: tier ? toNumber(tier.returnPct) : null,
      returnMultiplier,
      tierWeight,
      allocationWeight,
    };
  });

  const totalWeight = weighted.reduce((sum, row) => sum + row.allocationWeight, 0);

  const results: ReturnStructureAllocation[] = weighted.map((row) => {
    const allocationPct =
      totalWeight > 0 ? row.allocationWeight / totalWeight : 1 / weighted.length;

    return {
      allocationId: row.participant.allocationId,
      investorId: row.participant.investorId,
      investmentAmount: row.participant.investmentAmount,
      tierReturnPct: row.tierReturnPct,
      returnMultiplier: row.returnMultiplier,
      tierWeight: row.tierWeight,
      allocationWeight: row.allocationWeight,
      allocationPct: roundMoney(allocationPct * 1_000_000) / 1_000_000,
      profitShare: roundMoney(pool * allocationPct),
    };
  });

  const allocatedTotal = results.reduce((sum, row) => sum + row.profitShare, 0);
  const remainder = roundMoney(pool - allocatedTotal);
  if (remainder !== 0 && results.length > 0) {
    const lastIndex = results.length - 1;
    results[lastIndex] = {
      ...results[lastIndex]!,
      profitShare: roundMoney(results[lastIndex]!.profitShare + remainder),
    };
  }

  return results;
}
