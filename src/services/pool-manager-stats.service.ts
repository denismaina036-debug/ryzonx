import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import {
  ADMIN_PM_STATS_AUDIT_ACTIONS,
  POOL_MANAGER_STATS_ENTITY,
} from "@/constants/pool-manager-stats";
import {
  POOL_MANAGER_EDITABLE_STAT_FIELDS,
  POOL_MANAGER_JSON_STAT_FIELDS,
  POOL_MANAGER_STAT_COLUMN_MAP,
  POOL_MANAGER_STAT_FIELD_LABELS,
  type PoolManagerAdminStatistics,
  type PoolManagerStatField,
} from "@/domain/pool-manager/admin-statistics";
import { POOL_MANAGER_DYNAMIC_PERFORMANCE_FIELDS } from "@/domain/pool-manager/live-performance-statistics";
import {
  friendlyStatSaveError,
  normalizePoolManagerStatPatch,
} from "@/domain/pool-manager/stat-validation";
import { mergeAdminStatistics } from "@/lib/pool-manager/merge-admin-statistics";
import { computeLiveYearsOnRyvonX } from "@/lib/pool-manager/public-statistics";
import { auditService } from "@/services/audit.service";
import { poolManagerPerformanceStatsService } from "@/services/pool-manager-performance-stats.service";
import { resolveManagerPlatformPerformance } from "@/lib/pool-manager/resolve-manager-live-performance";

type ManagerRow = Record<string, unknown>;

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function readJsonStats(row: ManagerRow): PoolManagerAdminStatistics {
  const raw = row.admin_statistics;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const stats = raw as PoolManagerAdminStatistics;
  const normalized: PoolManagerAdminStatistics = { ...stats };
  if (normalized.yearsOnRyvonX == null && normalized.experienceYears != null) {
    normalized.yearsOnRyvonX = normalized.experienceYears;
  }
  if (
    normalized.displayInvestorCount == null &&
    normalized.activeInvestors != null
  ) {
    normalized.displayInvestorCount = normalized.activeInvestors;
  }
  return normalized;
}

function trackPerformanceOverrides(
  jsonPatch: PoolManagerAdminStatistics,
  patch: Partial<PoolManagerAdminStatistics>
): void {
  const overrides = new Set(jsonPatch.performanceStatOverrides ?? []);

  for (const field of POOL_MANAGER_DYNAMIC_PERFORMANCE_FIELDS) {
    if (!(field in patch)) continue;
    const value = patch[field];
    if (value === null || value === undefined) {
      overrides.delete(field);
    } else {
      overrides.add(field);
    }
  }

  jsonPatch.performanceStatOverrides =
    overrides.size > 0 ? Array.from(overrides) : undefined;
}

function normalizeEditableStatistics(
  row: ManagerRow,
  adminOverrides: PoolManagerAdminStatistics
): PoolManagerAdminStatistics {
  return {
    winRatePct: toNumber(row.win_rate_pct),
    avgMonthlyReturnPct: toNumber(row.avg_monthly_return_pct),
    maxDrawdownPct: toNumber(row.max_drawdown_pct),
    ryvonxRating: toNumber(row.ryvonx_rating),
    securityRating: toNumber(row.security_rating),
    aggressivenessRating: toNumber(row.aggressiveness_rating),
    displayReviewCount: toNumber(row.display_review_count),
    displayTradeCount: toNumber(row.display_trade_count),
    displayInvestorCount: toNumber(row.display_investor_count),
    ...adminOverrides,
    yearsOnRyvonX:
      adminOverrides.yearsOnRyvonX ??
      adminOverrides.experienceYears ??
      null,
  };
}

function statFieldLabel(field: PoolManagerStatField): string {
  if (field in POOL_MANAGER_STAT_FIELD_LABELS) {
    return POOL_MANAGER_STAT_FIELD_LABELS[
      field as keyof typeof POOL_MANAGER_STAT_FIELD_LABELS
    ];
  }
  return field;
}

function isEditableStatField(field: string): field is PoolManagerStatField {
  return POOL_MANAGER_EDITABLE_STAT_FIELDS.includes(
    field as (typeof POOL_MANAGER_EDITABLE_STAT_FIELDS)[number]
  );
}

function revalidateManagerSurfaces(slug: string | null): void {
  revalidatePath(ROUTES.marketplace);
  revalidatePath(ROUTES.marketplaceStrategies);
  revalidatePath(ROUTES.marketplaceCycles);
  revalidatePath(ROUTES.dashboard);
  revalidatePath(ROUTES.investments);
  if (slug) {
    revalidatePath(`${ROUTES.managerPublicProfile}/${slug}`);
  }
}

export interface PoolManagerLiveMetrics {
  winRatePct: number | null;
  avgMonthlyReturnPct: number | null;
  maxDrawdownPct: number | null;
  ryvonxRating: number | null;
  securityRating: number | null;
  aggressivenessRating: number | null;
  assetsUnderManagement: number;
  activeInvestors: number;
  publicReviewCount: number;
  publicTradeCount: number;
  yearsOnRyvonX: number;
  poolsManaged: number;
}

export interface PoolManagerStatisticsView {
  managerId: string;
  displayName: string;
  slug: string | null;
  /** Admin-editable baseline values (columns + JSON). */
  statistics: PoolManagerAdminStatistics;
  /** Raw admin_statistics JSONB only. */
  adminOverrides: PoolManagerAdminStatistics;
  /** Values computed from live platform activity (read-only reference). */
  liveMetrics: PoolManagerLiveMetrics;
  /** Values currently shown on the public profile. */
  publishedMetrics: PoolManagerLiveMetrics;
}

async function loadLiveMetrics(managerId: string, row: ManagerRow): Promise<PoolManagerLiveMetrics> {
  const db = createAdminClient();
  const adminOverrides = readJsonStats(row);
  const [poolsRes, reviewCountRes, performanceStats] = await Promise.all([
    db
      .from("funds")
      .select("active_investors, display_active_investors, assets_under_management")
      .eq("pool_manager_id", managerId)
      .in("lifecycle_status", ["live", "approved"]),
    db
      .from("pool_manager_reviews")
      .select("id", { count: "exact", head: true })
      .eq("pool_manager_id", managerId),
    adminOverrides.livePerformance
      ? Promise.resolve(adminOverrides.livePerformance)
      : resolveManagerPlatformPerformance(managerId, adminOverrides),
  ]);

  const poolRows = (poolsRes.data ?? []) as Array<{
    active_investors: number;
    display_active_investors: number;
    assets_under_management: number;
  }>;

  const liveInvestors = poolRows.reduce((s, p) => s + (toNumber(p.active_investors) ?? 0), 0);
  const liveReviewCount = reviewCountRes.count ?? 0;
  const liveTradeCount = performanceStats?.closedTrades ?? 0;
  const liveAum = poolRows.reduce(
    (s, p) => s + (toNumber(p.assets_under_management) ?? 0),
    0
  );
  const liveYears = computeLiveYearsOnRyvonX(String(row.created_at ?? new Date().toISOString()));

  return {
    winRatePct: performanceStats?.winRatePct ?? null,
    avgMonthlyReturnPct: null,
    maxDrawdownPct: null,
    ryvonxRating: null,
    securityRating: null,
    aggressivenessRating: null,
    assetsUnderManagement: liveAum,
    activeInvestors: liveInvestors,
    publicReviewCount: liveReviewCount,
    publicTradeCount: liveTradeCount,
    yearsOnRyvonX: liveYears,
    poolsManaged: poolRows.length,
  };
}

function computePublishedMetrics(
  live: PoolManagerLiveMetrics,
  statistics: PoolManagerAdminStatistics,
  adminOverrides: PoolManagerAdminStatistics
): PoolManagerLiveMetrics {
  const merged = mergeAdminStatistics(
    {
      winRatePct: live.winRatePct,
      avgMonthlyReturnPct: null,
      maxDrawdownPct: null,
      ryvonxRating: null,
      securityRating: null,
      aggressivenessRating: null,
      assetsUnderManagement: live.assetsUnderManagement,
      activeInvestors: live.activeInvestors,
      publicReviewCount: live.publicReviewCount,
      publicTradeCount: live.publicTradeCount,
      yearsOnRyvonX: live.yearsOnRyvonX,
    },
    {
      ...adminOverrides,
      ...statistics,
      livePerformance: adminOverrides.livePerformance ?? statistics.livePerformance,
      performanceStatOverrides:
        adminOverrides.performanceStatOverrides ?? statistics.performanceStatOverrides,
    }
  );

  return {
    winRatePct: merged.winRatePct ?? statistics.winRatePct ?? null,
    avgMonthlyReturnPct:
      merged.avgMonthlyReturnPct ?? statistics.avgMonthlyReturnPct ?? null,
    maxDrawdownPct: merged.maxDrawdownPct ?? statistics.maxDrawdownPct ?? null,
    ryvonxRating: merged.ryvonxRating ?? statistics.ryvonxRating ?? null,
    securityRating: merged.securityRating ?? statistics.securityRating ?? null,
    aggressivenessRating:
      merged.aggressivenessRating ?? statistics.aggressivenessRating ?? null,
    assetsUnderManagement: merged.assetsUnderManagement ?? live.assetsUnderManagement,
    activeInvestors: merged.activeInvestors ?? live.activeInvestors,
    publicReviewCount: merged.displayReviewCount ?? live.publicReviewCount,
    publicTradeCount: merged.displayTradeCount ?? live.publicTradeCount,
    yearsOnRyvonX: merged.yearsOnRyvonX ?? live.yearsOnRyvonX,
    poolsManaged: live.poolsManaged,
  };
}

export const poolManagerStatsService = {
  async getStatistics(managerId: string): Promise<PoolManagerStatisticsView> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data, error } = await db
      .from("pool_managers")
      .select("*")
      .eq("id", managerId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Pool Manager not found.");

    const row = data as ManagerRow;
    const adminOverrides = readJsonStats(row);
    const statistics = normalizeEditableStatistics(row, adminOverrides);
    const liveMetrics = await loadLiveMetrics(managerId, row);
    const publishedMetrics = computePublishedMetrics(
      liveMetrics,
      statistics,
      adminOverrides
    );

    return {
      managerId,
      displayName: String(row.display_name ?? "Pool Manager"),
      slug: (row.slug as string | null) ?? null,
      statistics,
      adminOverrides,
      liveMetrics,
      publishedMetrics,
    };
  },

  async updateStatistics(input: {
    managerId: string;
    patch: Partial<PoolManagerAdminStatistics>;
    reason?: string;
  }): Promise<PoolManagerStatisticsView> {
    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const { data: current, error: fetchError } = await db
      .from("pool_managers")
      .select("*")
      .eq("id", input.managerId)
      .maybeSingle();

    if (fetchError) throw new Error(fetchError.message);
    if (!current) throw new Error("Pool Manager not found.");

    const row = current as ManagerRow;
    const previousOverrides = readJsonStats(row);
    const previousStats = await this.getStatistics(input.managerId);
    const patch = normalizePoolManagerStatPatch(input.patch);

    const columnUpdates: Record<string, unknown> = {};
    const jsonPatch: PoolManagerAdminStatistics = { ...previousOverrides };
    delete jsonPatch.experienceYears;
    delete jsonPatch.activeInvestors;

    for (const [field, value] of Object.entries(patch) as Array<
      [PoolManagerStatField, unknown]
    >) {
      if (!isEditableStatField(field)) continue;

      const column = POOL_MANAGER_STAT_COLUMN_MAP[field];
      if (column) {
        columnUpdates[column] = value === "" ? null : value;
      } else if (POOL_MANAGER_JSON_STAT_FIELDS.includes(field)) {
        if (value === null || value === undefined || value === "") {
          delete jsonPatch[field];
        } else {
          jsonPatch[field] = value as never;
        }
      }
    }

    trackPerformanceOverrides(jsonPatch, patch);

    columnUpdates.admin_statistics = jsonPatch;

    const { error: updateError } = await db
      .from("pool_managers")
      .update(columnUpdates as never)
      .eq("id", input.managerId);

    if (updateError) throw new Error(friendlyStatSaveError(updateError));

    for (const [field, newValue] of Object.entries(patch) as Array<
      [PoolManagerStatField, unknown]
    >) {
      if (!isEditableStatField(field)) continue;
      const oldValue = previousStats.statistics[field];
      const normalizedNew = newValue === "" ? null : newValue;
      if (oldValue === normalizedNew) continue;

      await auditService.log({
        actorId: admin.id,
        action: ADMIN_PM_STATS_AUDIT_ACTIONS.STAT_UPDATED,
        entityType: POOL_MANAGER_STATS_ENTITY,
        entityId: input.managerId,
        oldValues: {
          field,
          label: statFieldLabel(field),
          value: oldValue ?? null,
        },
        newValues: {
          field,
          label: statFieldLabel(field),
          value: normalizedNew ?? null,
          reason: input.reason?.trim() || null,
        },
      });
    }

    revalidateManagerSurfaces((row.slug as string | null) ?? null);

    await poolManagerPerformanceStatsService
      .syncManager(input.managerId, "Admin updated manager statistics")
      .catch(() => undefined);

    return this.getStatistics(input.managerId);
  },

  async resetStatistics(input: {
    managerId: string;
    fields?: PoolManagerStatField[];
    reason?: string;
  }): Promise<PoolManagerStatisticsView> {
    const admin = await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    const before = await this.getStatistics(input.managerId);
    const resetFields = input.fields?.length
      ? input.fields
      : [...POOL_MANAGER_EDITABLE_STAT_FIELDS];

    const columnUpdates: Record<string, unknown> = {};
    const jsonPatch = { ...before.adminOverrides };

    for (const field of resetFields) {
      const column = POOL_MANAGER_STAT_COLUMN_MAP[field];
      if (column) {
        columnUpdates[column] = null;
      } else if (POOL_MANAGER_JSON_STAT_FIELDS.includes(field)) {
        delete jsonPatch[field];
      }

      jsonPatch.performanceStatOverrides = (
        jsonPatch.performanceStatOverrides ?? []
      ).filter((entry) => entry !== field);
    }

    if ((jsonPatch.performanceStatOverrides ?? []).length === 0) {
      delete jsonPatch.performanceStatOverrides;
    }

    delete jsonPatch.experienceYears;
    delete jsonPatch.activeInvestors;
    columnUpdates.admin_statistics = jsonPatch;

    const { error } = await db
      .from("pool_managers")
      .update(columnUpdates as never)
      .eq("id", input.managerId);

    if (error) throw new Error(error.message);

    await auditService.log({
      actorId: admin.id,
      action: ADMIN_PM_STATS_AUDIT_ACTIONS.STATS_RESET,
      entityType: POOL_MANAGER_STATS_ENTITY,
      entityId: input.managerId,
      oldValues: { fields: resetFields, statistics: before.statistics },
      newValues: { reason: input.reason?.trim() || null },
    });

    revalidateManagerSurfaces(before.slug);

    await poolManagerPerformanceStatsService
      .syncManager(input.managerId, "Admin reset manager statistics")
      .catch(() => undefined);

    return this.getStatistics(input.managerId);
  },
};
