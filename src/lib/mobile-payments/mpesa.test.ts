import { describe, expect, it } from "vitest";
import {
  initiateMobilePaymentSchema,
  megaPayWebhookSchema,
  normalizeKenyanPhone,
} from "./mpesa";

describe("M-Pesa payment validation", () => {
  it.each([
    ["0712345678", "254712345678"],
    ["712345678", "254712345678"],
    ["254712345678", "254712345678"],
    ["+254 712 345 678", "254712345678"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeKenyanPhone(input)).toBe(expected);
  });

  it("rejects non-Kenyan mobile numbers", () => {
    expect(() => normalizeKenyanPhone("12345")).toThrow("valid Kenyan M-Pesa number");
  });

  it("accepts only the active mpesa initiation method", () => {
    expect(initiateMobilePaymentSchema.safeParse({ method: "mpesa", amountUsd: 100, phone: "0712345678" }).success).toBe(true);
    expect(initiateMobilePaymentSchema.safeParse({ method: "airtel_money", amountUsd: 100, phone: "0733123456" }).success).toBe(false);
  });

  it("coerces documented MegaPay webhook values", () => {
    const parsed = megaPayWebhookSchema.parse({
      ResponseCode: "0",
      ResponseDescription: "Success",
      TransactionAmount: "13000",
      TransactionReference: "RVX-MP-TEST",
      Msisdn: 254712345678,
    });
    expect(parsed.ResponseCode).toBe(0);
    expect(parsed.TransactionAmount).toBe(13000);
    expect(parsed.Msisdn).toBe("254712345678");
  });
});
