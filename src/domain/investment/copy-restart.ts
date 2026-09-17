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
