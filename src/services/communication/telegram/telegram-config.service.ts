import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { auditService } from "@/services/audit.service";
import { decryptSecret, encryptSecret } from "@/lib/security/secret-encryption";
import { inspectTelegramConnection, sendTelegramTestMessage } from "./telegram-api";

type IntegrationRow = {
  enabled: boolean;
  encrypted_secret: string | null;
  secret_last_four: string | null;
  destination_id: string | null;
  append_website_link: boolean;
  bot_username: string | null;
  destination_title: string | null;
  last_tested_at: string | null;
  last_test_status: "success" | "failed" | null;
  updated_at: string;
};

const updateSchema = z.object({
  enabled: z.boolean(),
  botToken: z.string().trim().max(500).optional(),
  chatId: z.string().trim().max(200),
  appendWebsiteLink: z.boolean(),
});

function encryptionConfigured() {
  return Boolean(process.env.PAYMENT_CONFIG_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function getRow(): Promise<IntegrationRow | null> {
  const { data, error } = await (createAdminClient() as unknown as SupabaseClient)
    .from("communication_integrations")
    .select("enabled, encrypted_secret, secret_last_four, destination_id, append_website_link, bot_username, destination_title, last_tested_at, last_test_status, updated_at")
    .eq("provider", "telegram")
    .maybeSingle();
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return null;
    throw new Error(error.message);
  }
  return data as IntegrationRow | null;
}

export type TelegramAdminConfig = {
  enabled: boolean;
  tokenConfigured: boolean;
  tokenLastFour: string | null;
  chatId: string;
  appendWebsiteLink: boolean;
  encryptionConfigured: boolean;
  ready: boolean;
  botUsername: string | null;
  destinationTitle: string | null;
  lastTestedAt: string | null;
  lastTestStatus: "success" | "failed" | null;
  updatedAt: string | null;
};

function toAdminConfig(row: IntegrationRow | null): TelegramAdminConfig {
  const tokenConfigured = Boolean(row?.encrypted_secret);
  const chatId = row?.destination_id ?? "";
  const encrypted = encryptionConfigured();
  return {
    enabled: row?.enabled ?? false,
    tokenConfigured,
    tokenLastFour: row?.secret_last_four ?? null,
    chatId,
    appendWebsiteLink: row?.append_website_link ?? true,
    encryptionConfigured: encrypted,
    ready: Boolean(row?.enabled && tokenConfigured && chatId && encrypted),
    botUsername: row?.bot_username ?? null,
    destinationTitle: row?.destination_title ?? null,
    lastTestedAt: row?.last_tested_at ?? null,
    lastTestStatus: row?.last_test_status ?? null,
    updatedAt: row?.updated_at ?? null,
  };
}

export const telegramConfigService = {
  async getAdminConfig(): Promise<TelegramAdminConfig> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    return toAdminConfig(await getRow());
  },

  async getRuntimeConfig() {
    const row = await getRow();
    return {
      enabled: row?.enabled ?? false,
      token: row?.encrypted_secret ? decryptSecret(row.encrypted_secret) : null,
      chatId: row?.destination_id ?? null,
      appendWebsiteLink: row?.append_website_link ?? true,
    };
  },

  async update(input: unknown): Promise<TelegramAdminConfig> {
    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    const parsed = updateSchema.parse(input);
    const existing = await getRow();
    const token = parsed.botToken?.trim();
    if (token && !/^\d{6,}:[A-Za-z0-9_-]{20,}$/.test(token)) throw new Error("Enter a valid Telegram bot token.");
    if (token && !encryptionConfigured()) throw new Error("Server secret encryption is not configured.");
    if (parsed.enabled && (!token && !existing?.encrypted_secret)) throw new Error("Add a Telegram bot token before enabling publishing.");
    if (parsed.enabled && !parsed.chatId) throw new Error("Add a Telegram Chat ID before enabling publishing.");

    const payload = {
      provider: "telegram",
      enabled: parsed.enabled,
      destination_id: parsed.chatId || null,
      append_website_link: parsed.appendWebsiteLink,
      updated_by: admin.id,
      ...(token ? { encrypted_secret: encryptSecret(token), secret_last_four: token.slice(-4) } : {}),
    };
    const { error } = await (createAdminClient() as unknown as SupabaseClient).from("communication_integrations").upsert(payload, { onConflict: "provider" });
    if (error) throw new Error(error.message);
    await auditService.log({
      actorId: admin.id,
      action: "telegram_integration_updated",
      entityType: "communication_integration",
      entityId: "telegram",
      newValues: { enabled: parsed.enabled, destinationChanged: parsed.chatId !== (existing?.destination_id ?? ""), tokenRotated: Boolean(token), appendWebsiteLink: parsed.appendWebsiteLink },
    });
    return this.getAdminConfig();
  },

  async testConnection() {
    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    const runtime = await this.getRuntimeConfig();
    if (!runtime.token) throw new Error("Configure a Telegram bot token first.");
    if (!runtime.chatId) throw new Error("Configure a Telegram Chat ID first.");
    const db = createAdminClient() as unknown as SupabaseClient;
    try {
      const info = await inspectTelegramConnection(runtime.token, runtime.chatId);
      await sendTelegramTestMessage(runtime.token, runtime.chatId);
      await db.from("communication_integrations").update({ bot_username: info.botUsername, destination_title: info.destinationTitle, last_tested_at: new Date().toISOString(), last_test_status: "success" } as never).eq("provider", "telegram");
      await auditService.log({ actorId: admin.id, action: "telegram_connection_tested", entityType: "communication_integration", entityId: "telegram", newValues: { success: true } });
      return { ok: true, message: "Telegram connection successful. Test message delivered.", ...info };
    } catch (error) {
      await db.from("communication_integrations").update({ last_tested_at: new Date().toISOString(), last_test_status: "failed" } as never).eq("provider", "telegram");
      await auditService.log({ actorId: admin.id, action: "telegram_connection_tested", entityType: "communication_integration", entityId: "telegram", newValues: { success: false } });
      throw error;
    }
  },
};
