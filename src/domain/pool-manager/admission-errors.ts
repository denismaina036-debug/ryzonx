export class AdmissionInsufficientBalanceError extends Error {
  readonly code = "INSUFFICIENT_BALANCE" as const;
  readonly availableBalance: number;
  readonly requiredAmount: number;

  constructor(availableBalance: number, requiredAmount: number) {
    super(
      `Insufficient balance. You need ${requiredAmount.toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
      })} but only have ${availableBalance.toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
      })} available.`
    );
    this.name = "AdmissionInsufficientBalanceError";
    this.availableBalance = availableBalance;
    this.requiredAmount = requiredAmount;
  }
}

export interface AdmissionPaymentState {
  availableBalance: number;
  fee: number | null;
  admissionPath: string | null;
  sufficient: boolean;
  alreadyPaid: boolean;
}
