import { describe, expect, it } from "vitest";
import { megaPayInitiateResponseSchema } from "./megapay.schemas";

describe("MegaPay initiation response", () => {
  it("accepts the live boolean success response returned after an STK prompt", () => {
    const parsed = megaPayInitiateResponseSchema.parse({
      ResultCode: "0",
      ResponseCode: "0",
      success: true,
      message: "Please enter your MPESA PIN to complete the transaction",
      transaction_request_id: "PFXID2508202617474440594",
      MerchantRequestID: "merchant-request-id",
      CheckoutRequestID: "ws_CO_test",
      destination_type: "client",
      rotation_eligible: false,
    });

    expect(parsed.success).toBe(true);
    expect(parsed.transaction_request_id).toBe("PFXID2508202617474440594");
  });

  it.each(["200", 200, true])("accepts supported success value %s", (success) => {
    expect(
      megaPayInitiateResponseSchema.safeParse({
        success,
        transaction_request_id: "PFXID-test",
      }).success
    ).toBe(true);
  });
});
