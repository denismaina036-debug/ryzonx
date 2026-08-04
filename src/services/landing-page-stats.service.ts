import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_FUND_ID } from "@/constants/funds";
import { fundService } from "@/services/fund.service";
import { platformSettingsService } from "@/services/platform-settings.service";
import { parseLandingPageContent } from "@/domain/landing-page/merge";
import type { LandingAutomaticStatKey, LandingStatValueFormat } from "@/domain/landing-page/types";
import {
  formatLandingStatValue,
  inferFormatFromAutomaticKey,
  resolveManualStatValue,
} from "@/domain/landing-page/stat-format";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

async function countApprovedPoolManagers(db: ReturnType<typeof createAdminClient>): Promise<number> {
  const { count, error } = await db
    .from("pool_managers")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved");
  if (error) return 0;
  return count ?? 0;
}

async function countActivePools(db: ReturnType<typeof createAdminClient>): Promise<number> {
  const { count, error } = await db
    .from("funds")
    .select("id", { count: "exact", head: true })
    .eq("lifecycle_status", "live")
    .eq("status", "active")
    .eq("is_marketplace_listed", true);
  if (error) return 0;
  return count ?? 0;
}

async function countCompletedCycles(db: ReturnType<typeof createAdminClient>): Promise<number> {
  const { count, error } = await db
    .from("investment_cycles")
    .select("id", { count: "exact", head: true })
    .in("status", ["completed", "archived"]);
  if (error) return 0;
  return count ?? 0;
}

async function sumTotalCapital(db: ReturnType<typeof createAdminClient>): Promise<number> {
  const { data, error } = await db.from("funds").select("current_capital, investor_capital");
  if (error || !data) return 0;
  return (data as Array<{ current_capital?: number; investor_capital?: number }>).reduce(
    (sum, row) => sum + toNumber(row.investor_capital ?? row.current_capital),
    0
  );
}

async function countTotalInvestors(db: ReturnType<typeof createAdminClient>): Promise<number> {
  const { count, error } = await db
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "investor");
  if (error) return 0;
  return count ?? 0;
}

async function countSupportedBrokers(): Promise<number> {
  const raw = await platformSettingsService.get("landing_content");
  const content = parseLandingPageContent(raw);
  return content.brokers.filter((broker) => broker.isEnabled).length;
}

async function countDistinctCountries(db: ReturnType<typeof createAdminClient>): Promise<number> {
  const { data, error } = await db
    .from("pool_managers")
    .select("country")
    .eq("status", "approved");
  if (error || !data) return 0;

  const countries = new Set(
    (data as Array<{ country?: string | null }>)
      .map((row) => row.country?.trim())
      .filter((country): country is string => Boolean(country))
  );
  return countries.size;
}

function resolveValueFormat(input: {
  valueFormat?: LandingStatValueFormat;
  automaticKey?: LandingAutomaticStatKey;
}): LandingStatValueFormat {
  if (input.valueFormat) return input.valueFormat;
  if (input.automaticKey) return inferFormatFromAutomaticKey(input.automaticKey);
  return "number";
}

export const landingPageStatsService = {
  async resolveAutomaticNumericValue(key: LandingAutomaticStatKey): Promise<number | null> {
    const db = createAdminClient();

    try {
      switch (key) {
        case "verified_pool_managers":
          return await countApprovedPoolManagers(db);
        case "active_pools":
        case "trading_pools":
          return await countActivePools(db);
        case "completed_cycles":
          return await countCompletedCycles(db);
        case "total_capital":
        case "capital_managed":
          return await sumTotalCapital(db);
        case "total_investors":
          return await countTotalInvestors(db);
        case "supported_brokers":
          return await countSupportedBrokers();
        case "countries":
          return await countDistinctCountries(db);
        default: {
          const [stats, investorStats] = await Promise.all([
            fundService.getStats(DEFAULT_FUND_ID),
            fundService.getInvestorStats(DEFAULT_FUND_ID),
          ]);
          switch (key) {
            case "total_pool_value":
              return stats.totalPoolValue;
            case "active_investors":
              return stats.totalActiveInvestors;
            case "daily_roi":
              return stats.dailyRoi;
            case "monthly_roi":
              return stats.monthlyRoi;
            case "win_rate":
              return stats.winRate;
            case "closed_trades":
              return stats.totalClosedTrades;
            case "average_investment":
              return investorStats.averageInvestment;
            case "largest_investment":
              return investorStats.largestInvestment;
            case "average_roi":
              return investorStats.averageRoi;
            case "total_deposits":
              return investorStats.totalDeposits;
            case "total_withdrawals":
              return investorStats.totalWithdrawals;
            default:
              return null;
          }
        }
      }
    } catch {
      return null;
    }
  },

  async resolveStatValue(input: {
    mode: "manual" | "automatic";
    manualValue?: string;
    automaticKey?: LandingAutomaticStatKey;
    valueFormat?: LandingStatValueFormat;
  }): Promise<string> {
    const format = resolveValueFormat(input);

    if (input.mode === "manual") {
      return resolveManualStatValue(input.manualValue, format);
    }

    if (!input.automaticKey) return "—";

    const raw = await this.resolveAutomaticNumericValue(input.automaticKey);
    if (raw == null || !Number.isFinite(raw)) return "—";

    return formatLandingStatValue(raw, format);
  },
};
