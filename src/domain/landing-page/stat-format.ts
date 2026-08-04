import type { LandingAutomaticStatKey, LandingStatValueFormat } from "@/domain/landing-page/types";
import { formatCompactNumber, formatCurrency, formatPercentage } from "@/lib/utils";

const PERCENTAGE_KEYS = new Set<LandingAutomaticStatKey>([
  "daily_roi",
  "monthly_roi",
  "win_rate",
  "average_roi",
]);

const CURRENCY_KEYS = new Set<LandingAutomaticStatKey>([
  "total_capital",
  "capital_managed",
  "total_pool_value",
  "average_investment",
  "largest_investment",
  "total_deposits",
  "total_withdrawals",
]);

export function inferFormatFromAutomaticKey(
  key: LandingAutomaticStatKey
): LandingStatValueFormat {
  if (PERCENTAGE_KEYS.has(key)) return "percentage";
  if (CURRENCY_KEYS.has(key)) return "currency";
  return "number";
}

export function formatLandingStatValue(
  raw: number,
  format: LandingStatValueFormat
): string {
  switch (format) {
    case "currency":
      return formatCurrency(raw);
    case "percentage":
      return formatPercentage(raw);
    case "number":
      return formatCompactNumber(raw);
  }
}

export function resolveManualStatValue(
  manualValue: string | undefined,
  format: LandingStatValueFormat
): string {
  const trimmed = manualValue?.trim();
  if (!trimmed) return "—";

  const parsed = Number(trimmed.replace(/,/g, ""));
  if (!Number.isFinite(parsed)) {
    return trimmed;
  }

  return formatLandingStatValue(parsed, format);
}
