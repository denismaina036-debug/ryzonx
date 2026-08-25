import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./secret-encryption";

describe("payment-provider secret encryption", () => {
  const original = process.env.PAYMENT_CONFIG_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.PAYMENT_CONFIG_ENCRYPTION_KEY = "unit-test-master-key-that-is-not-for-production";
  });

  afterEach(() => {
    if (original == null) delete process.env.PAYMENT_CONFIG_ENCRYPTION_KEY;
    else process.env.PAYMENT_CONFIG_ENCRYPTION_KEY = original;
  });

  it("encrypts without retaining plaintext and decrypts losslessly", () => {
    const secret = "MGP-test-secret-value";
    const encrypted = encryptSecret(secret);
    expect(encrypted).not.toContain(secret);
    expect(encrypted.startsWith("v1.")).toBe(true);
    expect(decryptSecret(encrypted)).toBe(secret);
  });

  it("uses a unique nonce for every encryption", () => {
    expect(encryptSecret("same-secret")).not.toBe(encryptSecret("same-secret"));
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptSecret("sensitive");
    expect(() => decryptSecret(`${encrypted}tampered`)).toThrow();
  });
});
