import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/authorization";
import { auditService } from "@/services/audit.service";
import { PLATFORM_SERVICE_FEE_RATE } from "@/constants/profit-distribution";
import type { PlatformSetting } from "@/features/admin/types";
import { revalidateTag } from "next/cache";

type SettingRow = {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
};

const SETTING_GROUPS: Record<string, string> = {
  mpesa_min_deposit_usd: "Financial",
  crypto_min_deposit_usd: "Financial",
  platform_service_fee_pct: "Financial",
  min_investment: "Financial",
  min_withdrawal: "Financial",
  max_withdrawal: "Financial",
  referral_reward_amount: "Referrals",
  default_currency: "Financial",
  platform_name: "Branding",
  branding: "Branding",
  support_email: "Contact",
  business_email: "Contact",
  maintenance_mode: "Platform",
  registration_enabled: "Platform",
  pool_manager_applications_enabled: "Platform",
  landing_content: "Landing Page",
  feature_flags: "Platform",
};

const SETTING_LABELS: Record<string, string> = {
  mpesa_min_deposit_usd: "M-Pesa Minimum Deposit (USD)",
  crypto_min_deposit_usd: "Crypto Minimum Deposit (USD)",
  platform_service_fee_pct: "Platform Service Fee (%)",
  platform_name: "Platform Name",
  support_email: "Support Email",
  business_email: "Business Email",
  min_investment: "Minimum Investment",
  min_withdrawal: "Minimum Withdrawal",
  max_withdrawal: "Maximum Withdrawal",
  referral_reward_amount: "Reward Per Qualified Referral (USD)",
  default_currency: "Default Currency",
  maintenance_mode: "Maintenance Mode",
  registration_enabled: "Registration Enabled",
  pool_manager_applications_enabled: "Pool Manager Applications",
  branding: "Branding (JSON)",
  landing_content: "Landing Content (JSON)",
  feature_flags: "Feature Flags (JSON)",
};

function unwrapJsonValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function mapRow(row: SettingRow): PlatformSetting {
  return {
    key: row.key,
    label: SETTING_LABELS[row.key] ?? row.key,
    value: unwrapJsonValue(row.value),
    group: SETTING_GROUPS[row.key] ?? "General",
  };
}

export const platformSettingsService = {
  async getDepositMinimum(method: "mpesa" | "crypto"): Promise<number> {
    const raw = await this.get(`${method}_min_deposit_usd`);
    const value = Number(raw ?? 100);
    return Number.isFinite(value) && value > 0 ? value : 100;
  },
  async list(): Promise<PlatformSetting[]> {
    await requirePermission("MANAGE_SETTINGS");
    const db = createAdminClient();
    const { data, error } = await db
      .from("platform_settings")
      .select("*")
      .order("key");
    if (error) throw new Error(error.message);
    return ((data ?? []) as SettingRow[]).map(mapRow);
  },

  async get(key: string): Promise<unknown | null> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("platform_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as { value?: unknown } | null)?.value ?? null;
  },

  /** Financial policy fee rate: 0.025 (2.5%). */
  async getPlatformServiceFeeRate(): Promise<number> {
    // Financial policy is fixed at 2.5%. Keeping this resolver central ensures
    // realized and projected calculations cannot drift through stale settings.
    return PLATFORM_SERVICE_FEE_RATE;
  },

  async getFeatureFlag(flag: string): Promise<boolean> {
    const raw = await this.get("feature_flags");
    if (!raw || typeof raw !== "object") return false;
    return Boolean((raw as Record<string, unknown>)[flag]);
  },

  async upsertMany(
    updates: Array<{ key: string; value: unknown }>,
    actorId: string
  ): Promise<void> {
    await requirePermission("MANAGE_PLATFORM_CONFIG");
    const db = createAdminClient();

    for (const { key, value } of updates) {
      if (key === "referral_reward_amount") {
        const reward = Number(value);
        if (!Number.isFinite(reward) || reward < 0) {
          throw new Error("Referral reward must be a valid amount of zero or more.");
        }
      }
      if (key === "mpesa_min_deposit_usd" || key === "crypto_min_deposit_usd") {
        const minimum = Number(value);
        if (!Number.isFinite(minimum) || minimum <= 0) {
          throw new Error("Deposit minimum must be greater than zero.");
        }
      }

      const jsonValue =
        typeof value === "string" &&
        (key === "branding" || key === "landing_content" || key === "feature_flags")
          ? JSON.parse(value)
          : key === "platform_service_fee_pct" ||
              key === "mpesa_min_deposit_usd" ||
              key === "crypto_min_deposit_usd" ||
              key === "min_investment" ||
              key === "min_withdrawal" ||
              key === "referral_reward_amount"
            ? Number(value)
            : key === "maintenance_mode" ||
                key === "registration_enabled" ||
                key === "pool_manager_applications_enabled"
              ? value === "true" || value === true
              : value;

      const { error } = await db.from("platform_settings").upsert(
        {
          key,
          value: jsonValue as never,
          updated_by: actorId,
        } as never,
        { onConflict: "key" }
      );
      if (error) throw new Error(error.message);
      if (key === "landing_content") revalidateTag("landing-content", "max");

      await auditService.log({
        actorId,
        action: "platform_setting_updated",
        entityType: "platform_settings",
        entityId: key,
        newValues: { key, value: jsonValue },
      });
    }
  },
};
