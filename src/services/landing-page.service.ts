import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/authorization";
import { platformSettingsService } from "@/services/platform-settings.service";
import { landingPageStatsService } from "@/services/landing-page-stats.service";
import { DEFAULT_LANDING_PAGE_CONTENT } from "@/domain/landing-page/defaults";
import { withTimeout } from "@/lib/async/with-timeout";
import { mergeLandingPageContent, parseLandingPageContent } from "@/domain/landing-page/merge";
import type {
  LandingHeroFloatingStat,
  LandingPageContent,
  LandingStatItem,
  PublicLandingPageContent,
  ResolvedLandingStat,
} from "@/domain/landing-page/types";

export type { PublicLandingPageContent, ResolvedLandingStat };

async function resolveStats(stats: LandingStatItem[]): Promise<ResolvedLandingStat[]> {
  return Promise.all(
    stats.map(async (stat) => ({
      ...stat,
      resolvedValue: await withTimeout(
        landingPageStatsService.resolveStatValue({
          mode: stat.mode,
          manualValue: stat.manualValue,
          automaticKey: stat.automaticKey,
          valueFormat: stat.valueFormat,
        }),
        1_500,
        `Landing statistic ${stat.id} timed out`
      ).catch(() => stat.manualValue?.trim() || "—"),
    }))
  );
}

async function resolveHeroStats(stats: LandingHeroFloatingStat[]): Promise<ResolvedLandingStat[]> {
  return Promise.all(
    stats.map(async (stat) => ({
      ...stat,
      resolvedValue: await withTimeout(
        landingPageStatsService.resolveStatValue({
          mode: stat.mode,
          manualValue: stat.manualValue,
          automaticKey: stat.automaticKey,
          valueFormat: stat.valueFormat,
        }),
        1_500,
        `Landing hero statistic ${stat.id} timed out`
      ).catch(() => stat.manualValue?.trim() || "—"),
      changeType: stat.changeType,
    }))
  );
}

const loadRawPublicContent = unstable_cache(
  async (): Promise<LandingPageContent> => {
    try {
      const raw = await withTimeout(
        platformSettingsService.get("landing_content"),
        1_500,
        "Landing content read timed out"
      );
      return parseLandingPageContent(raw);
    } catch (error) {
      console.warn(
        "[landing-page] public content read failed — using defaults.",
        error instanceof Error ? error.message : error
      );
      return parseLandingPageContent(null);
    }
  },
  ["landing-page-raw-content"],
  { revalidate: 300, tags: ["landing-content"] }
);

const loadResolvedPublicContent = unstable_cache(
  async (): Promise<PublicLandingPageContent> => {
    const content = await loadRawPublicContent();
    const [heroStats, statistics] = await Promise.all([
      resolveHeroStats(content.heroStats),
      resolveStats(content.statistics),
    ]);
    return { ...content, heroStats, statistics };
  },
  ["landing-page-resolved-content"],
  { revalidate: 60, tags: ["landing-content"] }
);

export const landingPageService = {
  getRawContent: cache(loadRawPublicContent),

  getPublicContent: cache(loadResolvedPublicContent),

  async getAdminContent(): Promise<LandingPageContent> {
    await requirePermission("MANAGE_PLATFORM_CONFIG");
    const raw = await platformSettingsService.get("landing_content");
    return parseLandingPageContent(raw);
  },

  async saveContent(content: LandingPageContent, actorId: string): Promise<LandingPageContent> {
    await requirePermission("MANAGE_PLATFORM_CONFIG");
    const merged = mergeLandingPageContent(content);
    const db = createAdminClient();
    const { error } = await db.from("platform_settings").upsert(
      {
        key: "landing_content",
        value: merged as never,
        updated_by: actorId,
      } as never,
      { onConflict: "key" }
    );
    if (error) throw new Error(error.message);
    revalidateTag("landing-content", "max");

    const { auditService } = await import("@/services/audit.service");
    await auditService.log({
      actorId,
      action: "landing_page_content_updated",
      entityType: "platform_settings",
      entityId: "landing_content",
      newValues: { sections: merged.sections },
    });

    return merged;
  },

  getDefaults(): LandingPageContent {
    return DEFAULT_LANDING_PAGE_CONTENT;
  },
};
