import { z } from "zod";

const kenyaPhone = /^(?:254|0)?7\d{8}$/;

export function normalizeKenyanPhone(value: string): string {
  const compact = value.replace(/[\s()+-]/g, "");
  if (!kenyaPhone.test(compact)) {
    throw new Error("Enter a valid Kenyan M-Pesa number, for example 0712345678.");
  }
  if (compact.startsWith("254")) return compact;
  if (compact.startsWith("0")) return `254${compact.slice(1)}`;
  return `254${compact}`;
}

export function maskPhone(value: string): string {
  return value.length < 7 ? value : `${value.slice(0, 5)}***${value.slice(-3)}`;
}

export const initiateMobilePaymentSchema = z.object({
  method: z.literal("mpesa"),
  amountUsd: z.coerce.number().positive().max(100_000),
  phone: z.string().trim().min(9).max(20),
});

export const megaPayWebhookSchema = z.object({
  ResponseCode: z.coerce.number(),
  ResponseDescription: z.string().optional().default(""),
  MerchantRequestID: z.string().optional().default(""),
  CheckoutRequestID: z.string().optional().default(""),
  TransactionID: z.string().optional().default(""),
  TransactionAmount: z.coerce.number().nonnegative(),
  TransactionReceipt: z.string().optional().default(""),
  TransactionDate: z.union([z.string(), z.number()]).optional(),
  TransactionReference: z.string().min(1),
  Msisdn: z.union([z.string(), z.number()]).transform(String),
}).passthrough();

