/**
 * Communication-facing participant count: the pool's pre-platform investor
 * baseline plus investors recorded in the current RyvonX cycle.
 */
export function resolveCommunicatedInvestorCount(
  initialInvestorCount: number | string | null | undefined,
  cycleInvestorCount: number | string | null | undefined
): number {
  const initial = Number(initialInvestorCount ?? 0);
  const live = Number(cycleInvestorCount ?? 0);

  const safeInitial = Number.isFinite(initial) ? Math.max(0, Math.floor(initial)) : 0;
  const safeLive = Number.isFinite(live) ? Math.max(0, Math.floor(live)) : 0;

  return safeInitial + safeLive;
}
