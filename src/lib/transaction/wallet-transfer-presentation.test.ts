import { describe, expect, it } from "vitest";
import { buildInvestorTransactionDetail, buildTransactionPresentation } from "./presentation";

const baseInput = {
  id: "transaction-id",
  amount: 500,
  status: "approved",
  paymentMethod: "crypto",
  reference: null,
  transactionReference: "RVX-TXN-20260901-000001",
  notes: null,
  adminNotes: null,
  fundId: "funding-wallet-id",
  fundName: "RyvonX Funding Wallet",
  cryptoSymbol: "USDT",
  cryptoNetwork: "TRON",
  cryptoAmount: 500,
  createdAt: "2026-09-01T12:00:00.000Z",
  processedAt: "2026-09-01T12:05:00.000Z",
};

describe("wallet transfer transaction presentation", () => {
  it("presents deposits as received from the stored sender wallet", () => {
    const input = {
      ...baseInput,
      type: "deposit",
      destination: null,
      metadata: {
        sender_wallet: "TExampleSenderWallet1234567890",
        explorer_url: "https://example.com/tx/abc",
      },
    };

    const presentation = buildTransactionPresentation(input);
    const detail = buildInvestorTransactionDetail(input);

    expect(presentation.title).toBe("Received");
    expect(presentation.subtitle).toBe("From: TExa...7890");
    expect(detail.detailFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Sender", value: "TExampleSenderWallet1234567890" }),
      ])
    );
    expect(detail.blockchainExplorerUrl).toBe("https://example.com/tx/abc");
  });

  it("presents withdrawals as sent to the saved recipient wallet", () => {
    const input = {
      ...baseInput,
      type: "withdrawal",
      destination: "TExampleRecipientWallet0987654321",
      metadata: { network_fee: "1.00 USDT" },
    };

    const presentation = buildTransactionPresentation(input);
    const detail = buildInvestorTransactionDetail(input);

    expect(presentation.title).toBe("Sent");
    expect(presentation.subtitle).toBe("To: TExa...4321");
    expect(detail.detailFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Recipient",
          value: "TExampleRecipientWallet0987654321",
        }),
        expect.objectContaining({ label: "Network Fee", value: "1.00 USDT" }),
      ])
    );
  });
});
