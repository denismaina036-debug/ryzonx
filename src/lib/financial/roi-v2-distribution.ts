import { PLATFORM_SERVICE_FEE_RATE } from "@/constants/profit-distribution";
import type { PlatformInvestmentLevel } from "@/domain/roi";
import type {
  AllocationCapitalBasis,
  InvestorProfitAllocation,
  ProfitDistributionBreakdown,
} from "@/lib/financial/profit-distribution-calculator";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function isProfitTierFulfilled(
  capitalBasis: number,
  roiMultiplier: number,
  cumulativeRealisedReturn: number
): boolean {
  return cumulativeRealisedReturn >= roundMoney(capitalBasis * roiMultiplier);
}

export interface RoiV2AllocationInput extends AllocationCapitalBasis {
  roiMultiplier: number;
  cumulativeRealisedReturn: number;
  targetFulfilled: boolean;
  investmentLevelId: string | null;
}

export interface RoiV2DistributionResult extends ProfitDistributionBreakdown {
  /** Surplus profit credited to Pool Manager after all investor targets fulfilled. */
  poolManagerSurplus: number;
  /** Updated target fulfillment state per allocation. */
  allocationUpdates: Array<{
    allocationId: string;
    cumulativeRealisedReturn: number;
    targetFulfilled: boolean;
  }>;
}

/**
 * ROI Engine v2 settlement:
 * 1. Gross realised trading profit
 * 2. Deduct 2.5% platform fee from positive profit
 * 3. Remaining = distributable pool profit
 * 4. Distribute proportionally by capital ownership
 * 5. Track cumulative realised return vs projected target
 * 6. Surplus (after all targets fulfilled) → Pool Manager
 */
export function calculateRoiV2Distribution(input: {
  grossTradingProfit: number;
  platformServiceFeeRate?: number;
  allocations: RoiV2AllocationInput[];
}): RoiV2DistributionResult {
  const feeRate = input.platformServiceFeeRate ?? PLATFORM_SERVICE_FEE_RATE;
  const gross = roundMoney(input.grossTradingProfit);

  const taxableGross = gross > 0 ? gross : 0;
  const platformServiceFee = roundMoney(taxableGross * feeRate);
  const netDistributableProfit =
    gross > 0 ? roundMoney(taxableGross - platformServiceFee) : roundMoney(gross);

  const totalCapital = roundMoney(
    input.allocations.reduce((s, a) => s + a.capitalBasis, 0)
  );

  let investorAllocations: InvestorProfitAllocation[];
  let poolManagerSurplus = 0;

  if (netDistributableProfit <= 0 || totalCapital <= 0) {
    // Losses distributed proportionally by capital ownership
    investorAllocations = input.allocations.map((alloc) => {
      const ownershipPct = totalCapital > 0 ? alloc.capitalBasis / totalCapital : 0;
      const profitShare =
        netDistributableProfit < 0
          ? roundMoney(netDistributableProfit * ownershipPct)
          : 0;
      return {
        allocationId: alloc.allocationId,
        investorId: alloc.investorId,
        capitalBasis: alloc.capitalBasis,
        tierReturnPct: null,
        returnMultiplier: alloc.roiMultiplier,
        tierWeight: 0,
        allocationWeight: alloc.capitalBasis,
        ownershipPct,
        profitShare,
      };
    });
  } else {
    // Check if all investor targets are already fulfilled
    const allTargetsFulfilled =
      input.allocations.length > 0 &&
      input.allocations.every((a) => a.targetFulfilled);

    if (allTargetsFulfilled) {
      // All surplus goes to Pool Manager
      poolManagerSurplus = netDistributableProfit;
      investorAllocations = input.allocations.map((alloc) => ({
        allocationId: alloc.allocationId,
        investorId: alloc.investorId,
        capitalBasis: alloc.capitalBasis,
        tierReturnPct: null,
        returnMultiplier: alloc.roiMultiplier,
        tierWeight: 0,
        allocationWeight: alloc.capitalBasis,
        ownershipPct: totalCapital > 0 ? alloc.capitalBasis / totalCapital : 0,
        profitShare: 0,
      }));
    } else {
      const remainingTargets = input.allocations.map((alloc) =>
        alloc.targetFulfilled
          ? 0
          : roundMoney(
              Math.max(
                0,
                alloc.capitalBasis * alloc.roiMultiplier - alloc.cumulativeRealisedReturn
              )
            )
      );
      const totalRemainingTarget = roundMoney(
        remainingTargets.reduce((sum, target) => sum + target, 0)
      );
      const shares = input.allocations.map(() => 0);
      let remainingPool = netDistributableProfit;

      if (netDistributableProfit >= totalRemainingTarget) {
        for (let i = 0; i < shares.length; i++) shares[i] = remainingTargets[i] ?? 0;
        remainingPool = roundMoney(netDistributableProfit - totalRemainingTarget);
      } else {
        // When profit cannot satisfy every tier, share all available profit by
        // client capital. Re-run after a client reaches their cap so no profit
        // is stranded and no client receives more than their tier.
        let active = input.allocations
          .map((_, index) => index)
          .filter((index) => (remainingTargets[index] ?? 0) > 0);

        while (remainingPool > 0 && active.length > 0) {
          const activeCapital = active.reduce(
            (sum, index) => sum + input.allocations[index]!.capitalBasis,
            0
          );
          if (activeCapital <= 0) break;

          let distributedThisPass = 0;
          for (let position = 0; position < active.length; position++) {
            const index = active[position]!;
            const allocation = input.allocations[index]!;
            const cap = roundMoney((remainingTargets[index] ?? 0) - shares[index]!);
            const proportionalShare =
              position === active.length - 1
                ? roundMoney(remainingPool - distributedThisPass)
                : roundMoney(remainingPool * (allocation.capitalBasis / activeCapital));
            const share = roundMoney(Math.min(cap, proportionalShare));
            shares[index] = roundMoney(shares[index]! + share);
            distributedThisPass = roundMoney(distributedThisPass + share);
          }

          if (distributedThisPass <= 0) break;
          remainingPool = roundMoney(remainingPool - distributedThisPass);
          active = active.filter(
            (index) => shares[index]! < (remainingTargets[index] ?? 0)
          );
        }
      }

      investorAllocations = input.allocations.map((alloc, index) => ({
        allocationId: alloc.allocationId,
        investorId: alloc.investorId,
        capitalBasis: alloc.capitalBasis,
        tierReturnPct: null,
        returnMultiplier: alloc.roiMultiplier,
        tierWeight: 0,
        allocationWeight: alloc.capitalBasis,
        ownershipPct: alloc.capitalBasis / totalCapital,
        profitShare: shares[index] ?? 0,
      }));

      // Any remainder from capping goes to PM if all now fulfilled, else redistribute
      const allocationUpdates = input.allocations.map((alloc, i) => {
        const share = investorAllocations[i]?.profitShare ?? 0;
        const newCumulative = roundMoney(alloc.cumulativeRealisedReturn + Math.max(0, share));
        const fulfilled =
          alloc.targetFulfilled ||
          isProfitTierFulfilled(alloc.capitalBasis, alloc.roiMultiplier, newCumulative);
        return {
          allocationId: alloc.allocationId,
          cumulativeRealisedReturn: newCumulative,
          targetFulfilled: fulfilled,
        };
      });

      const allNowFulfilled = allocationUpdates.every((u) => u.targetFulfilled);
      if (allNowFulfilled && remainingPool > 0) {
        poolManagerSurplus = remainingPool;
      }

      return buildResult({
        gross,
        feeRate,
        platformServiceFee,
        netDistributableProfit,
        investorAllocations,
        poolManagerSurplus,
        allocationUpdates,
      });
    }
  }

  const allocationUpdates = input.allocations.map((alloc, i) => {
    const share = investorAllocations[i]?.profitShare ?? 0;
    const newCumulative = roundMoney(
      alloc.cumulativeRealisedReturn + (share > 0 ? share : 0)
    );
    return {
      allocationId: alloc.allocationId,
      cumulativeRealisedReturn: newCumulative,
      targetFulfilled:
        alloc.targetFulfilled ||
        isProfitTierFulfilled(alloc.capitalBasis, alloc.roiMultiplier, newCumulative),
    };
  });

  return buildResult({
    gross,
    feeRate,
    platformServiceFee,
    netDistributableProfit,
    investorAllocations,
    poolManagerSurplus,
    allocationUpdates,
  });
}

/** Pure ownership distribution — no ROI target caps. */
export function calculateOwnershipOnlyDistribution(input: {
  grossTradingProfit: number;
  platformServiceFeeRate?: number;
  allocations: Array<{
    allocationId: string;
    investorId: string;
    capitalBasis: number;
    ownershipPct: number;
  }>;
}): RoiV2DistributionResult {
  const feeRate = input.platformServiceFeeRate ?? PLATFORM_SERVICE_FEE_RATE;
  const gross = roundMoney(input.grossTradingProfit);
  const taxableGross = gross > 0 ? gross : 0;
  const platformServiceFee = roundMoney(taxableGross * feeRate);
  const netDistributableProfit =
    gross > 0 ? roundMoney(taxableGross - platformServiceFee) : roundMoney(gross);

  const investorAllocations: InvestorProfitAllocation[] = input.allocations.map((alloc) => {
    const profitShare =
      netDistributableProfit !== 0
        ? roundMoney(netDistributableProfit * alloc.ownershipPct)
        : 0;
    return {
      allocationId: alloc.allocationId,
      investorId: alloc.investorId,
      capitalBasis: alloc.capitalBasis,
      tierReturnPct: null,
      returnMultiplier: 1,
      tierWeight: 0,
      allocationWeight: alloc.capitalBasis,
      ownershipPct: alloc.ownershipPct,
      profitShare,
    };
  });

  return buildResult({
    gross,
    feeRate,
    platformServiceFee,
    netDistributableProfit,
    investorAllocations,
    poolManagerSurplus: 0,
    allocationUpdates: input.allocations.map((a) => ({
      allocationId: a.allocationId,
      cumulativeRealisedReturn: 0,
      targetFulfilled: false,
    })),
  });
}

function buildResult(input: {
  gross: number;
  feeRate: number;
  platformServiceFee: number;
  netDistributableProfit: number;
  investorAllocations: InvestorProfitAllocation[];
  poolManagerSurplus: number;
  allocationUpdates: RoiV2DistributionResult["allocationUpdates"];
}): RoiV2DistributionResult {
  const investorProfitPool = roundMoney(
    input.investorAllocations.reduce((s, a) => s + Math.max(0, a.profitShare), 0)
  );

  return {
    grossTradingProfit: input.gross,
    platformServiceFeePct: input.feeRate,
    platformServiceFee: input.platformServiceFee,
    netDistributableProfit: input.netDistributableProfit,
    poolManagerSharePct: 0,
    poolManagerEarnings: input.poolManagerSurplus,
    investorProfitPool,
    investorSharePct:
      input.netDistributableProfit > 0
        ? roundMoney((investorProfitPool / input.netDistributableProfit) * 100)
        : 100,
    investorDistributionTotal: investorProfitPool,
    investorAllocations: input.investorAllocations,
    poolManagerSurplus: input.poolManagerSurplus,
    allocationUpdates: input.allocationUpdates,
  };
}

/** Resolve investment level + progressive ROI multiplier for an investment amount. */
export function resolveAllocationRoi(input: {
  amount: number;
  levels: PlatformInvestmentLevel[];
  multipliers: Array<{ investmentLevelId: string; multiplier: number }>;
}): {
  investmentLevelId: string | null;
  roiMultiplier: number | null;
  projectedPayout: number | null;
} {
  const sorted = input.levels.filter((l) => l.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  let matched: PlatformInvestmentLevel | null = null;
  let matchedIndex = -1;
  for (let i = 0; i < sorted.length; i++) {
    const level = sorted[i]!;
    const aboveMin = input.amount >= level.minAmount;
    const belowMax = level.maxAmount == null || input.amount <= level.maxAmount;
    if (aboveMin && belowMax) {
      matched = level;
      matchedIndex = i;
      break;
    }
  }
  if (!matched) {
    return { investmentLevelId: null, roiMultiplier: null, projectedPayout: null };
  }

  const tierMaxMult =
    input.multipliers.find((m) => m.investmentLevelId === matched!.id)?.multiplier ?? null;
  if (tierMaxMult == null) {
    return { investmentLevelId: matched.id, roiMultiplier: null, projectedPayout: null };
  }

  const previousTier = matchedIndex > 0 ? sorted[matchedIndex - 1] : null;
  const previousMaxMult = previousTier
    ? input.multipliers.find((m) => m.investmentLevelId === previousTier.id)?.multiplier ?? 1
    : 1;

  const progressiveMultiplier = calculateProgressiveMultiplier({
    amount: input.amount,
    level: matched,
    minMultiplier: previousMaxMult,
    maxMultiplier: tierMaxMult,
  });

  return {
    investmentLevelId: matched.id,
    roiMultiplier: progressiveMultiplier,
    projectedPayout: roundMoney(input.amount * progressiveMultiplier),
  };
}

/** Linear interpolation: min amount → minMultiplier, max amount → maxMultiplier. */
export function calculateProgressiveMultiplier(input: {
  amount: number;
  level: PlatformInvestmentLevel;
  minMultiplier: number;
  maxMultiplier: number;
}): number {
  const minAmount = input.level.minAmount;
  const maxAmount = input.level.maxAmount ?? input.amount;
  if (maxAmount <= minAmount) return roundMoney(input.maxMultiplier);
  const ratio = Math.min(1, Math.max(0, (input.amount - minAmount) / (maxAmount - minAmount)));
  return roundMoney(input.minMultiplier + (input.maxMultiplier - input.minMultiplier) * ratio);
}
