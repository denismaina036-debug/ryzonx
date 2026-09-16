import { describe, expect, it } from "vitest";
import { buildTransactionPresentation } from "./presentation";

const input = {
  id: "transaction-id",
  type: "adjustment",
  amount: 1250,
  status: "completed",
  reference: null,
  transactionReference: "RVX-CPY-20260915-000001",
  notes: "Copying balance",
  destination: null,
  fundId: "strategy-id",
  fundName: "Verified Trader",
  cryptoSymbol: null,
  cryptoNetwork: null,
  cryptoAmount: null,
  createdAt: "2026-09-15T12:00:00.000Z",
  processedAt: "2026-09-15T12:00:00.000Z",
  metadata: { currency: "USD" },
};

describe("copying lifecycle transaction presentation", () => {
  it("presents a combined stop as one positive strategy settlement", () => {
    const result = buildTransactionPresentation({ ...input, paymentMethod: "copy_stop" });

    expect(result.title).toBe("Stopped Copying");
    expect(result.category).toBe("pool_settlement");
    expect(result.amountPrefix).toBe("+");
    expect(result.isCredit).toBe(true);
  });

  it("presents automatic continuation without reinvestment language", () => {
    const result = buildTransactionPresentation({ ...input, paymentMethod: "copy_continue" });

    expect(result.title).toBe("Copying Continued");
    expect(result.title.toLowerCase()).not.toContain("reinvest");
  });
});
