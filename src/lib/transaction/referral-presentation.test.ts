import { describe, expect, it } from "vitest";
import { buildTransactionPresentation } from "./presentation";

describe("referral reward transaction presentation", () => {
  it("shows referral rewards as a positive USD credit", () => {
    const presentation = buildTransactionPresentation({
      id: "reward-transaction",
      type: "adjustment",
      amount: 5,
      status: "completed",
      paymentMethod: "reward",
      reference: null,
      transactionReference: "RVX-RWD-20260824-000001",
      notes: "Referral reward — A friend joined and invested",
      destination: null,
      fundId: "00000000-0000-4000-a000-000000000001",
      fundName: "RyvonX Funding Wallet",
      cryptoSymbol: null,
      cryptoNetwork: null,
      cryptoAmount: null,
      createdAt: "2026-08-24T12:00:00.000Z",
      processedAt: "2026-08-24T12:00:00.000Z",
      metadata: { currency: "USD", referralId: "referral-id" },
    });

    expect(presentation.title).toBe("Referral Reward");
    expect(presentation.subtitle).toBe("RyvonX Referral Program");
    expect(presentation.amountPrefix).toBe("+");
    expect(presentation.amountSuffix).toBe("USD");
    expect(presentation.isCredit).toBe(true);
  });
});

