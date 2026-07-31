import { PLATFORM_SERVICE_FEE_RATE } from "@/constants/profit-distribution";
import {
  isTargetFulfilled,
  type PlatformInvestmentLevel,
} from "@/domain/roi";
import type {
  AllocationCapitalBasis,
  InvestorProfitAllocation,
  ProfitDistributionBreakdown,
} from "@/lib/financial/profit-distribution-calculator";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
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
      // Distribute proportionally; cap each investor at remaining target obligation
      let remainingPool = netDistributableProfit;
      investorAllocations = [];

      for (const alloc of input.allocations) {
        const ownershipPct = alloc.capitalBasis / totalCapital;
        const rawShare = roundMoney(netDistributableProfit * ownershipPct);

        if (alloc.targetFulfilled) {
          investorAllocations.push({
            allocationId: alloc.allocationId,
            investorId: alloc.investorId,
            capitalBasis: alloc.capitalBasis,
            tierReturnPct: null,
            returnMultiplier: alloc.roiMultiplier,
            tierWeight: 0,
            allocationWeight: alloc.capitalBasis,
            ownershipPct,
            profitShare: 0,
          });
          continue;
        }

        const targetProfit = roundMoney(
          alloc.capitalBasis * alloc.roiMultiplier - alloc.capitalBasis
        );
        const remainingTarget = roundMoney(
          Math.max(0, targetProfit - alloc.cumulativeRealisedReturn)
        );
        const profitShare = roundMoney(Math.min(rawShare, remainingTarget));

        investorAllocations.push({
          allocationId: alloc.allocationId,
          investorId: alloc.investorId,
          capitalBasis: alloc.capitalBasis,
          tierReturnPct: null,
          returnMultiplier: alloc.roiMultiplier,
          tierWeight: 0,
          allocationWeight: alloc.capitalBasis,
          ownershipPct,
          profitShare,
        });
        remainingPool = roundMoney(remainingPool - profitShare);
      }

      // Any remainder from capping goes to PM if all now fulfilled, else redistribute
      const allocationUpdates = input.allocations.map((alloc, i) => {
        const share = investorAllocations[i]?.profitShare ?? 0;
        const newCumulative = roundMoney(alloc.cumulativeRealisedReturn + Math.max(0, share));
        const fulfilled =
          alloc.targetFulfilled ||
          isTargetFulfilled(alloc.capitalBasis, alloc.roiMultiplier, newCumulative);
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
        isTargetFulfilled(alloc.capitalBasis, alloc.roiMultiplier, newCumulative),
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
