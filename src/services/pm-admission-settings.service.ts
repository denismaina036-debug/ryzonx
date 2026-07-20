import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/authorization";
import { auditService } from "@/services/audit.service";
import { platformSettingsService } from "@/services/platform-settings.service";
import {
  DEFAULT_PM_ADMISSION_SETTINGS,
  parsePmAdmissionSettings,
  type PmAdmissionSettings,
} from "@/domain/pool-manager/admission-settings";

export const pmAdmissionSettingsService = {
  async get(): Promise<PmAdmissionSettings> {
    const raw = await platformSettingsService.get("pm_admission_settings");
    return parsePmAdmissionSettings(raw);
  },

  async getPublic(): Promise<PmAdmissionSettings> {
    return this.get();
  },

  async update(settings: PmAdmissionSettings, actorId: string): Promise<PmAdmissionSettings> {
    await requirePermission("MANAGE_PLATFORM_CONFIG");
    const db = createAdminClient();

    const parsed = parsePmAdmissionSettings(settings);
    const { error } = await db.from("platform_settings").upsert(
      {
        key: "pm_admission_settings",
        value: parsed,
        description: "Pool Manager admission fees and challenge configuration",
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "key" }
    );

    if (error) throw new Error(error.message);

    await auditService.log({
      actorId,
      action: "pm_admission_settings_updated",
      entityType: "platform_settings",
      entityId: "pm_admission_settings",
      newValues: parsed as unknown as Record<string, unknown>,
    });

    return parsed;
  },

  defaults(): PmAdmissionSettings {
    return { ...DEFAULT_PM_ADMISSION_SETTINGS };
  },
};
