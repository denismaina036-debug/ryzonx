function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export type CycleLossCapacityInput = {
  capital: number;
  recordedLoss: number;
  resultingCyclePnl: number;
};

/**
 * A cycle cannot lose more than the capital committed to that cycle. The
 * individual loss guard also prevents a single recorded trade from exceeding
 * that capital, even when earlier profitable trades would offset it.
 */
export function getCycleLossCapacityError(input: CycleLossCapacityInput): string | null {
  const capital = roundMoney(Math.max(0, input.capital));
  const recordedLoss = roundMoney(Math.max(0, input.recordedLoss));
  const netLoss = roundMoney(Math.max(0, -input.resultingCyclePnl));

  if (recordedLoss > capital) {
    return "A recorded loss cannot exceed the total capital traded in the cycle.";
  }
  if (netLoss > capital) {
    return "The cycle's total loss cannot exceed the total capital traded in the cycle.";
  }
  return null;
}

export function assertCycleLossWithinCapital(input: CycleLossCapacityInput): void {
  const error = getCycleLossCapacityError(input);
  if (error) throw new Error(error);
}

export function calculateCapitalAfterLoss(capital: number, loss: number): number {
  return roundMoney(Math.max(0, capital - Math.max(0, loss)));
}
