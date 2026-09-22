export type PendingCopySettlementRef = {
  fundId: string;
  investmentCycleId: string;
};

/** Select an already-persisted between-cycle balance without consulting newer cycles. */
export function selectPendingCopySettlement<T extends PendingCopySettlementRef>(
  settlements: readonly T[],
  fundId: string,
  investmentCycleIds?: readonly string[]
): T | null {
  return (
    settlements.find(
      (settlement) =>
        settlement.fundId === fundId &&
        (!investmentCycleIds?.length ||
          investmentCycleIds.includes(settlement.investmentCycleId))
    ) ?? null
  );
}

export function hasRecoverableAllocationBalance(allocation: {
  amount: number;
  returnedCapitalAmount: number;
}): boolean {
  return allocation.amount > allocation.returnedCapitalAmount;
}
