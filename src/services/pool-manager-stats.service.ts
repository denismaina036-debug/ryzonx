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
  POOL_MANAGER_JSON_STAT_FIELDS,
  POOL_MANAGER_STAT_COLUMN_MAP,
  POOL_MANAGER_STAT_FIELD_LABELS,
  type PoolManagerAdminStatistics,
  type PoolManagerStatField,
} from "@/domain/pool-manager/admin-statistics";
import { auditService } from "@/services/audit.service";

type ManagerRow = Record<string, unknown>;

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function readJsonStats(row: ManagerRow): PoolManagerAdminStatistics {
  const raw = row.admin_statistics;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as PoolManagerAdminStatistics;
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

export interface PoolManagerStatisticsView {
  managerId: string;
  displayName: string;
  slug: string | null;
  /** Current effective values (columns + JSON overrides). */
  statistics: PoolManagerAdminStatistics;
  /** Raw admin_statistics JSONB only. */
  adminOverrides: PoolManagerAdminStatistics;
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

    const statistics: PoolManagerAdminStatistics = {
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
    };

    return {
      managerId,
      displayName: String(row.display_name ?? "Pool Manager"),
      slug: (row.slug as string | null) ?? null,
      statistics,
      adminOverrides,
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

    const columnUpdates: Record<string, unknown> = {};
    const jsonPatch: PoolManagerAdminStatistics = { ...previousOverrides };

    for (const [field, value] of Object.entries(input.patch) as Array<
      [PoolManagerStatField, unknown]
    >) {
      if (!(field in POOL_MANAGER_STAT_FIELD_LABELS)) continue;

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

    columnUpdates.admin_statistics = jsonPatch;

    const { error: updateError } = await db
      .from("pool_managers")
      .update(columnUpdates as never)
      .eq("id", input.managerId);

    if (updateError) throw new Error(updateError.message);

    for (const [field, newValue] of Object.entries(input.patch) as Array<
      [PoolManagerStatField, unknown]
    >) {
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
          label: POOL_MANAGER_STAT_FIELD_LABELS[field],
          value: oldValue ?? null,
        },
        newValues: {
          field,
          label: POOL_MANAGER_STAT_FIELD_LABELS[field],
          value: normalizedNew ?? null,
          reason: input.reason?.trim() || null,
        },
      });
    }

    revalidateManagerSurfaces((row.slug as string | null) ?? null);

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
      : (Object.keys(POOL_MANAGER_STAT_FIELD_LABELS) as PoolManagerStatField[]);

    const columnUpdates: Record<string, unknown> = {};
    const jsonPatch = { ...before.adminOverrides };

    for (const field of resetFields) {
      const column = POOL_MANAGER_STAT_COLUMN_MAP[field];
      if (column) {
        columnUpdates[column] = null;
      } else {
        delete jsonPatch[field];
      }
    }

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

    return this.getStatistics(input.managerId);
  },
};
