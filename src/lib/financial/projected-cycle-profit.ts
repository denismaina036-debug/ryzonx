import { PLATFORM_SERVICE_FEE_RATE } from "@/constants/profit-distribution";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export type ProjectedProfitParticipantInput = {
  id: string;
  investorId: string;
  amount: number;
  sharePct: number;
};

export type ProjectedProfitShare = ProjectedProfitParticipantInput & {
  projectedProfit: number;
};

function splitProRataShares(
  totalAmount: number,
  participants: ProjectedProfitParticipantInput[]
): Map<string, number> {
  const poolTotal = roundMoney(participants.reduce((sum, row) => sum + row.amount, 0));
  const result = new Map<string, number>();
  if (poolTotal <= 0 || totalAmount <= 0) {
    for (const row of participants) result.set(row.investorId, 0);
    return result;
  }

  let allocated = 0;
  participants.forEach((row, index) => {
    let share: number;
    if (index === participants.length - 1) {
      share = roundMoney(totalAmount - allocated);
    } else {
      share = roundMoney(totalAmount * (row.amount / poolTotal));
      allocated += share;
    }
    result.set(row.investorId, share);
  });
  return result;
}

/**
 * Read-only estimate of each investor's share of current cycle P&L if distribution ran now.
 * Does not mutate wallets, portfolio value, or settlement state.
 */
export function computeProjectedProfitShares(
  currentCycleProfit: number,
  participants: ProjectedProfitParticipantInput[],
  platformServiceFeeRate = PLATFORM_SERVICE_FEE_RATE
): ProjectedProfitShare[] {
  if (participants.length === 0) return [];

  if (currentCycleProfit === 0) {
    return participants.map((row) => ({ ...row, projectedProfit: 0 }));
  }

  // Positive cycle P&L is gross: deduct the RyvonX fee exactly once before
  // allocating the investor-specific projection. Losses are never fee-bearing.
  const projectedDistributableProfit =
    currentCycleProfit > 0
      ? roundMoney(currentCycleProfit * (1 - platformServiceFeeRate))
      : currentCycleProfit;
  const magnitude = Math.abs(projectedDistributableProfit);
  const sign = currentCycleProfit >= 0 ? 1 : -1;
  const shares = splitProRataShares(magnitude, participants);

  return participants.map((row) => ({
    ...row,
    projectedProfit: roundMoney((shares.get(row.investorId) ?? 0) * sign),
  }));
}

export function computeSingleProjectedProfitShare(
  currentCycleProfit: number,
  investmentAmount: number,
  poolTotal: number,
  platformServiceFeeRate = PLATFORM_SERVICE_FEE_RATE
): number {
  if (poolTotal <= 0 || investmentAmount <= 0 || currentCycleProfit === 0) return 0;
  const ownershipPct = investmentAmount / poolTotal;
  const projectedDistributableProfit =
    currentCycleProfit > 0
      ? roundMoney(currentCycleProfit * (1 - platformServiceFeeRate))
      : currentCycleProfit;
  return roundMoney(projectedDistributableProfit * ownershipPct);
}
