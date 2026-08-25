import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/authorization";
import { auditService } from "@/services/audit.service";
import { decryptSecret, encryptSecret } from "@/lib/security/secret-encryption";

type ProviderConfigRow = {
  provider: "megapay";
  encrypted_api_key: string | null;
  api_key_last_four: string | null;
  account_email: string | null;
  kes_per_usd: string | number | null;
  is_enabled: boolean;
  initiate_url: string;
  status_url: string;
  request_timeout_ms: number;
  merchant_display_name: string;
  webhook_registered: boolean;
  updated_at: string;
};

export type MegaPayAdminConfig = {
  enabled: boolean;
  accountEmail: string;
  kesPerUsd: number | null;
  apiKeyConfigured: boolean;
  apiKeyLastFour: string | null;
  source: "database" | "environment" | "none";
  encryptionConfigured: boolean;
  initiateUrl: string;
  statusUrl: string;
  requestTimeoutMs: number;
  merchantDisplayName: string;
  webhookRegistered: boolean;
  webhookUrl: string;
  ready: boolean;
  updatedAt: string | null;
};

export type MegaPayRuntimeConfig = {
  apiKey: string | null;
  accountEmail: string | null;
  kesPerUsd: number | null;
  enabled: boolean;
  initiateUrl: string;
  statusUrl: string;
  requestTimeoutMs: number;
  merchantDisplayName: string;
};

const updateSchema = z.object({
  enabled: z.boolean(),
  accountEmail: z.union([z.string().trim().email(), z.literal("")]),
  kesPerUsd: z.union([z.coerce.number().positive().max(10_000), z.null()]),
  apiKey: z.string().trim().max(500).optional(),
  initiateUrl: z.string().url().refine((value) => value.startsWith("https://"), "Initiation URL must use HTTPS."),
  statusUrl: z.string().url().refine((value) => value.startsWith("https://"), "Status URL must use HTTPS."),
  requestTimeoutMs: z.coerce.number().int().min(5000).max(60000),
  merchantDisplayName: z.string().trim().min(1).max(100),
  webhookRegistered: z.boolean(),
});

function dbClient(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

async function row(): Promise<ProviderConfigRow | null> {
  const { data, error } = await dbClient().from("payment_provider_configs").select("*").eq("provider", "megapay").maybeSingle();
  if (error) {
    if (error.code === "42P01" || error.message.includes("payment_provider_configs")) return null;
    throw new Error(error.message);
  }
  return data as ProviderConfigRow | null;
}

function envRate(): number | null {
  const value = Number(process.env.MOBILE_PAY_KES_PER_USD);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function encryptionConfigured(): boolean {
  return Boolean(process.env.PAYMENT_CONFIG_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function webhookUrl(): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://ryvonx.com").replace(/\/$/, "");
  return `${appUrl}/api/webhooks/megapay`;
}

function envInitiateUrl(): string {
  return process.env.MEGAPAY_STK_URL ?? "https://megapay.co.ke/backend/v1/initiatestk";
}

function envStatusUrl(): string {
  return process.env.MEGAPAY_STATUS_URL ?? "https://megapay.co.ke/backend/v1/transactionstatus";
}

export const paymentProviderConfigService = {
  async getAdminConfig(): Promise<MegaPayAdminConfig> {
    await requirePermission("MANAGE_PLATFORM_CONFIG");
    const stored = await row();
    const environmentConfigured = Boolean(process.env.MEGAPAY_API_KEY);
    const apiKeyConfigured = Boolean(stored?.encrypted_api_key || environmentConfigured);
    const accountEmail = stored?.account_email ?? process.env.MEGAPAY_ACCOUNT_EMAIL ?? "";
    const kesPerUsd = stored?.kes_per_usd == null ? envRate() : Number(stored.kes_per_usd);
    const enabled = stored?.is_enabled ?? process.env.ENABLE_MOBILE_PAYMENTS !== "false";
    const webhookRegistered = stored?.webhook_registered ?? false;
    const merchantDisplayName = stored?.merchant_display_name ?? "RYVONX";
    return {
      enabled,
      accountEmail,
      kesPerUsd,
      apiKeyConfigured,
      apiKeyLastFour: stored?.api_key_last_four ?? (environmentConfigured ? process.env.MEGAPAY_API_KEY!.slice(-4) : null),
      source: stored?.encrypted_api_key ? "database" : environmentConfigured ? "environment" : "none",
      encryptionConfigured: encryptionConfigured(),
      initiateUrl: stored?.initiate_url ?? envInitiateUrl(),
      statusUrl: stored?.status_url ?? envStatusUrl(),
      requestTimeoutMs: stored?.request_timeout_ms ?? 20000,
      merchantDisplayName,
      webhookRegistered,
      webhookUrl: webhookUrl(),
      ready: Boolean(enabled && apiKeyConfigured && accountEmail && kesPerUsd && encryptionConfigured() && webhookRegistered && merchantDisplayName),
      updatedAt: stored?.updated_at ?? null,
    };
  },

  async getRuntimeConfig(): Promise<MegaPayRuntimeConfig> {
    const stored = await row();
    let apiKey = process.env.MEGAPAY_API_KEY ?? null;
    if (stored?.encrypted_api_key) apiKey = decryptSecret(stored.encrypted_api_key);
    return {
      apiKey,
      accountEmail: stored?.account_email ?? process.env.MEGAPAY_ACCOUNT_EMAIL ?? null,
      kesPerUsd: stored?.kes_per_usd == null ? envRate() : Number(stored.kes_per_usd),
      enabled: stored?.is_enabled ?? process.env.ENABLE_MOBILE_PAYMENTS !== "false",
      initiateUrl: stored?.initiate_url ?? envInitiateUrl(),
      statusUrl: stored?.status_url ?? envStatusUrl(),
      requestTimeoutMs: stored?.request_timeout_ms ?? 20000,
      merchantDisplayName: stored?.merchant_display_name ?? "RYVONX",
    };
  },

  async updateMegaPay(input: unknown, actorId: string): Promise<MegaPayAdminConfig> {
    await requirePermission("MANAGE_PLATFORM_CONFIG");
    const parsed = updateSchema.parse(input);
    const existing = await row();
    const apiKey = parsed.apiKey?.trim();
    if (parsed.enabled && !apiKey && !existing?.encrypted_api_key && !process.env.MEGAPAY_API_KEY) {
      throw new Error("Enter a MegaPay API key before enabling the provider.");
    }
    if (parsed.enabled && (!parsed.accountEmail || !parsed.kesPerUsd || !parsed.webhookRegistered)) {
      throw new Error("Complete the merchant email, conversion rate, and webhook setup before enabling M-Pesa.");
    }
    if (apiKey && !encryptionConfigured()) {
      throw new Error("Configure PAYMENT_CONFIG_ENCRYPTION_KEY on the server before saving an API key.");
    }

    const payload = {
      provider: "megapay",
      account_email: parsed.accountEmail,
      kes_per_usd: parsed.kesPerUsd,
      is_enabled: parsed.enabled,
      initiate_url: parsed.initiateUrl,
      status_url: parsed.statusUrl,
      request_timeout_ms: parsed.requestTimeoutMs,
      merchant_display_name: parsed.merchantDisplayName,
      webhook_registered: parsed.webhookRegistered,
      updated_by: actorId,
      ...(apiKey ? { encrypted_api_key: encryptSecret(apiKey), api_key_last_four: apiKey.slice(-4) } : {}),
    };
    const { error } = await dbClient().from("payment_provider_configs").upsert(payload, { onConflict: "provider" });
    if (error) throw new Error(error.message);

    await auditService.log({
      actorId,
      action: "payment_provider_config_updated",
      entityType: "payment_provider_config",
      entityId: "megapay",
      newValues: {
        provider: "megapay",
        enabled: parsed.enabled,
        accountEmailChanged: parsed.accountEmail !== (existing?.account_email ?? process.env.MEGAPAY_ACCOUNT_EMAIL ?? ""),
        exchangeRate: parsed.kesPerUsd,
        apiKeyRotated: Boolean(apiKey),
        endpointsChanged:
          parsed.initiateUrl !== (existing?.initiate_url ?? envInitiateUrl()) ||
          parsed.statusUrl !== (existing?.status_url ?? envStatusUrl()),
        requestTimeoutMs: parsed.requestTimeoutMs,
        merchantDisplayName: parsed.merchantDisplayName,
        webhookRegistered: parsed.webhookRegistered,
      },
    });
    return this.getAdminConfig();
  },
};
