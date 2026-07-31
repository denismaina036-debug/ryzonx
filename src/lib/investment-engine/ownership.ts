/** Round to cents. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Ownership = investor capital / total pool capital. */
export function computeOwnershipPct(investorCapital: number, poolCapital: number): number {
  if (poolCapital <= 0 || investorCapital <= 0) return 0;
  return roundMoney((investorCapital / poolCapital) * 1_000_000) / 10_000;
}

export function distributeProRataByOwnership<T extends { capital: number; key: string }>(
  totalAmount: number,
  holders: T[]
): Array<T & { share: number; ownershipPct: number }> {
  const poolTotal = roundMoney(holders.reduce((s, h) => s + h.capital, 0));
  if (poolTotal <= 0 || totalAmount === 0) return [];

  let allocated = 0;
  return holders.map((holder, index) => {
    const ownershipPct = holder.capital / poolTotal;
    let share: number;
    if (index === holders.length - 1) {
      share = roundMoney(totalAmount - allocated);
    } else {
      share = roundMoney(totalAmount * ownershipPct);
      allocated += share;
    }
    return { ...holder, share, ownershipPct: roundMoney(ownershipPct * 1_000_000) / 1_000_000 };
  });
}
