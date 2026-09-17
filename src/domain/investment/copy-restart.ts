import type { InvestmentAllocationStatus } from "@/constants/investment-allocation";

const STOPPED_ALLOCATION_STATUSES = new Set<InvestmentAllocationStatus>([
  "cancelled",
  "rejected",
]);

export function resolveMarketplaceCopyRestart(input: {
  status: InvestmentAllocationStatus;
  existingAmount: number;
  incomingAmount: number;
  existingFundingConfirmedAt: string | null;
  now: string;
}): {
  restartingStoppedCopy: boolean;
  nextAmount: number;
  fundingConfirmedAt: string;
} {
  const restartingStoppedCopy = STOPPED_ALLOCATION_STATUSES.has(input.status);
  return {
    restartingStoppedCopy,
    nextAmount: restartingStoppedCopy
      ? input.incomingAmount
      : input.existingAmount + input.incomingAmount,
    fundingConfirmedAt: restartingStoppedCopy
      ? input.now
      : input.existingFundingConfirmedAt ?? input.now,
  };
}

export function isCopyRestartAfterStop(input: {
  returnableAmount: number;
  fundingConfirmedAt: string | null;
  createdAt: string;
  stoppedAt: string;
}): boolean {
  if (input.returnableAmount <= 0) return false;
  const currentCopyStartedAt = input.fundingConfirmedAt ?? input.createdAt;
  return new Date(currentCopyStartedAt) > new Date(input.stoppedAt);
}
