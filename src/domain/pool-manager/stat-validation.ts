import type { PoolManagerAdminStatistics, PoolManagerStatField } from "@/domain/pool-manager/admin-statistics";
import { POOL_MANAGER_STAT_FIELD_LABELS } from "@/domain/pool-manager/admin-statistics";

const MAX_INTEGER = 2_147_483_647;

type StatRule = {
  min?: number;
  max?: number;
  decimals?: number;
  integer?: boolean;
};

const STAT_RULES: Partial<Record<PoolManagerStatField, StatRule>> = {
  winRatePct: { min: 0, max: 100, decimals: 2 },
  avgMonthlyReturnPct: { min: -9999.9999, max: 9999.9999, decimals: 4 },
  maxDrawdownPct: { min: 0, max: 9999.9999, decimals: 4 },
  successRatio: { min: 0, max: 100, decimals: 4 },
  ryvonxRating: { min: 0, max: 5, decimals: 1 },
  securityRating: { min: 0, max: 5, decimals: 1 },
  aggressivenessRating: { min: 0, max: 5, decimals: 1 },
  consistencyScore: { min: 0, max: 100, decimals: 2 },
  safetyRating: { min: 0, max: 100, decimals: 2 },
  performanceRating: { min: 0, max: 100, decimals: 2 },
  assetsUnderManagement: { min: 0, max: 999_999_999_999.99, decimals: 2 },
  totalCapitalManaged: { min: 0, max: 999_999_999_999.99, decimals: 2 },
  totalProfits: { min: -999_999_999_999.99, max: 999_999_999_999.99, decimals: 2 },
  displayInvestorCount: { min: 0, max: MAX_INTEGER, integer: true },
  displayReviewCount: { min: 0, max: MAX_INTEGER, integer: true },
  displayTradeCount: { min: 0, max: MAX_INTEGER, integer: true },
  successfulCycles: { min: 0, max: MAX_INTEGER, integer: true },
  followers: { min: 0, max: MAX_INTEGER, integer: true },
  averageTradeDurationHours: { min: 0, max: 999_999.99, decimals: 2 },
  yearsOnRyvonX: { min: 0, max: 80, decimals: 1 },
};

function label(field: PoolManagerStatField): string {
  return (
    POOL_MANAGER_STAT_FIELD_LABELS[
      field as keyof typeof POOL_MANAGER_STAT_FIELD_LABELS
    ] ?? field
  );
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function normalizePoolManagerStatValue(
  field: PoolManagerStatField,
  value: unknown
): string | number | null {
  if (value === null || value === undefined || value === "") return null;
  if (field === "riskRating") {
    const text = String(value).trim();
    return text.length > 0 ? text : null;
  }

  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) {
    throw new Error(`${label(field)} must be a valid number.`);
  }

  const rule = STAT_RULES[field];
  if (!rule) return num;

  if (rule.min != null && num < rule.min) {
    throw new Error(`${label(field)} must be at least ${rule.min}.`);
  }
  if (rule.max != null && num > rule.max) {
    throw new Error(
      `${label(field)} must be at most ${rule.max.toLocaleString("en-US")}.`
    );
  }

  if (rule.integer) return Math.round(num);
  if (rule.decimals != null) return roundTo(num, rule.decimals);
  return num;
}

export function normalizePoolManagerStatPatch(
  patch: Partial<PoolManagerAdminStatistics>
): Partial<PoolManagerAdminStatistics> {
  const normalized: Partial<PoolManagerAdminStatistics> = {};

  for (const [field, value] of Object.entries(patch) as Array<
    [PoolManagerStatField, unknown]
  >) {
    normalized[field] = normalizePoolManagerStatValue(field, value) as never;
  }

  return normalized;
}

export function friendlyStatSaveError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Save failed.";
  if (/numeric field overflow/i.test(message)) {
    return "One or more statistics exceed the allowed range. Check ratings (0–5), percentages (0–100), and monthly return values before saving.";
  }
  return message;
}
