import { describe, expect, it } from "vitest";
import { buildTransactionPresentation } from "./presentation";

describe("cycle loss transaction presentation", () => {
  it("shows a distributed pool loss as a negative USD activity", () => {
    const presentation = buildTransactionPresentation({
      id: "loss-transaction",
      type: "adjustment",
      amount: 200,
      status: "completed",
      paymentMethod: "cycle_loss",
      reference: null,
      transactionReference: "RVX-LSS-20260901-000001",
      notes: "Pool Loss — Black Diamond",
      destination: null,
      fundId: "pool-id",
      fundName: "Black Diamond",
      cryptoSymbol: null,
      cryptoNetwork: null,
      cryptoAmount: null,
      createdAt: "2026-09-01T12:00:00.000Z",
      processedAt: "2026-09-01T12:00:00.000Z",
      metadata: { currency: "USD", cycleId: "cycle-id" },
    });

    expect(presentation.title).toBe("Pool Loss");
    expect(presentation.subtitle).toBe("Black Diamond");
    expect(presentation.amountPrefix).toBe("-");
    expect(presentation.amountSuffix).toBe("USD");
    expect(presentation.isCredit).toBe(false);
  });
});
