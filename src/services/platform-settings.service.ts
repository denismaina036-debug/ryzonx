import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/authorization";
import { auditService } from "@/services/audit.service";
import { PLATFORM_SERVICE_FEE_RATE } from "@/constants/profit-distribution";
import type { PlatformSetting } from "@/features/admin/types";

type SettingRow = {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
};

const SETTING_GROUPS: Record<string, string> = {
  platform_service_fee_pct: "Financial",
  min_investment: "Financial",
  min_withdrawal: "Financial",
  max_withdrawal: "Financial",
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
  platform_service_fee_pct: "Platform Service Fee (%)",
  platform_name: "Platform Name",
  support_email: "Support Email",
  business_email: "Business Email",
  min_investment: "Minimum Investment",
  min_withdrawal: "Minimum Withdrawal",
  max_withdrawal: "Maximum Withdrawal",
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

  /** Platform service fee rate (0.025 = 2.5%). Falls back to constant if unset. */
  async getPlatformServiceFeeRate(): Promise<number> {
    const raw = await this.get("platform_service_fee_pct");
    if (raw == null) return PLATFORM_SERVICE_FEE_RATE;
    const pct = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(pct) || pct < 0) return PLATFORM_SERVICE_FEE_RATE;
    return pct / 100;
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
      const jsonValue =
        typeof value === "string" &&
        (key === "branding" || key === "landing_content" || key === "feature_flags")
          ? JSON.parse(value)
          : key === "platform_service_fee_pct" ||
              key === "min_investment" ||
              key === "min_withdrawal"
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
