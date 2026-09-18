export interface FundingCycleCandidate {
  id: string;
  fund_id: string | null;
  status: string;
  cycle_number: number;
}

export const DUPLICATE_FUNDING_CYCLE_ERROR =
  "Multiple investment cycles are accepting new copiers for the same pool.";

/** The single cycle allowed to receive new copier capital for a pool. */
export function selectFundingCycleForNewCopier<T extends FundingCycleCandidate>(
  cycles: readonly T[],
  fundId: string
): T | null {
  const matches = cycles.filter(
    (cycle) => cycle.fund_id === fundId && cycle.status === "funding"
  );

  if (matches.length > 1) {
    throw new Error(DUPLICATE_FUNDING_CYCLE_ERROR);
  }

  return matches[0] ?? null;
}
