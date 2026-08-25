import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";

function encryptionKey(): Buffer {
  const configured = process.env.PAYMENT_CONFIG_ENCRYPTION_KEY;
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const source = configured || fallback;
  if (!source) {
    throw new Error("Payment configuration encryption is not configured on the server.");
  }
  return createHash("sha256").update(source).digest();
}

export function encryptSecret(plaintext: string): string {
  const value = plaintext.trim();
  if (!value) throw new Error("API key cannot be empty.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptSecret(value: string): string {
  const [version, ivValue, tagValue, encryptedValue] = value.split(".");
  if (version !== VERSION || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Encrypted payment configuration is invalid.");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

