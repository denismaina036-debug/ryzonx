import { z } from "zod";
import { paymentProviderConfigService } from "@/services/payment-provider-config.service";

const initiateResponseSchema = z.object({
  success: z.union([z.string(), z.number()]).optional(),
  massage: z.string().optional(),
  message: z.string().optional(),
  transaction_request_id: z.string().min(1),
}).passthrough();

const statusResponseSchema = z.object({
  ResultCode: z.union([z.string(), z.number()]),
  ResultDesc: z.string().optional().default(""),
  TransactionID: z.string().optional().default(""),
  TransactionStatus: z.string().optional().default(""),
  TransactionCode: z.union([z.string(), z.number()]).optional(),
  TransactionReceipt: z.string().optional().default(""),
  TransactionAmount: z.coerce.number(),
  Msisdn: z.union([z.string(), z.number()]).transform(String),
  TransactionDate: z.union([z.string(), z.number()]).optional(),
  TransactionReference: z.string(),
}).passthrough();

async function configuration() {
  const stored = await paymentProviderConfigService.getRuntimeConfig();
  if (!stored.enabled || !stored.apiKey || !stored.accountEmail) {
    throw new Error("M-Pesa is not fully configured. Add the MegaPay account email.");
  }
  return {
    apiKey: stored.apiKey,
    email: stored.accountEmail,
    initiateUrl: stored.initiateUrl,
    statusUrl: stored.statusUrl,
    requestTimeoutMs: stored.requestTimeoutMs,
  };
}

async function postJson(url: string, body: Record<string, unknown>, timeoutMs: number): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`MegaPay returned an invalid response (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    const message = typeof payload === "object" && payload && "message" in payload
      ? String((payload as { message: unknown }).message)
      : `MegaPay request failed (HTTP ${response.status}).`;
    throw new Error(message);
  }
  return payload;
}

export const megaPayService = {
  async isConfigured(): Promise<boolean> {
    const stored = await paymentProviderConfigService.getRuntimeConfig();
    return Boolean(stored.enabled && stored.apiKey && stored.accountEmail && stored.kesPerUsd);
  },

  async initiate(input: { amountKes: number; phone: string; reference: string }) {
    const config = await configuration();
    const payload = await postJson(config.initiateUrl, {
      api_key: config.apiKey,
      email: config.email,
      amount: input.amountKes,
      msisdn: input.phone,
      reference: input.reference,
    }, config.requestTimeoutMs);
    return initiateResponseSchema.parse(payload);
  },

  async status(transactionRequestId: string) {
    const config = await configuration();
    const payload = await postJson(config.statusUrl, {
      api_key: config.apiKey,
      email: config.email,
      transaction_request_id: transactionRequestId,
    }, config.requestTimeoutMs);
    return statusResponseSchema.parse(payload);
  },
};
