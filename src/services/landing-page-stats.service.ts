import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_FUND_ID } from "@/constants/funds";
import { fundService } from "@/services/fund.service";
import type { LandingAutomaticStatKey } from "@/domain/landing-page/types";
import { formatCompactNumber, formatCurrency, formatPercentage } from "@/lib/utils";

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

export const landingPageStatsService = {
  async resolveAutomaticValue(key: LandingAutomaticStatKey): Promise<string> {
    const db = createAdminClient();

    try {
      switch (key) {
        case "verified_pool_managers":
          return String(await countApprovedPoolManagers(db));
        case "active_pools":
          return String(await countActivePools(db));
        case "completed_cycles":
          return String(await countCompletedCycles(db));
        case "total_capital":
          return formatCurrency(await sumTotalCapital(db));
        case "total_investors":
          return String(await countTotalInvestors(db));
        default: {
          const [stats, investorStats] = await Promise.all([
            fundService.getStats(DEFAULT_FUND_ID),
            fundService.getInvestorStats(DEFAULT_FUND_ID),
          ]);
          switch (key) {
            case "total_pool_value":
              return formatCurrency(stats.totalPoolValue);
            case "active_investors":
              return String(stats.totalActiveInvestors);
            case "daily_roi":
              return formatPercentage(stats.dailyRoi);
            case "monthly_roi":
              return formatPercentage(stats.monthlyRoi);
            case "win_rate":
              return `${stats.winRate}%`;
            case "closed_trades":
              return formatCompactNumber(stats.totalClosedTrades);
            case "average_investment":
              return formatCurrency(investorStats.averageInvestment);
            case "largest_investment":
              return formatCurrency(investorStats.largestInvestment);
            case "average_roi":
              return formatPercentage(investorStats.averageRoi);
            case "total_deposits":
              return formatCurrency(investorStats.totalDeposits);
            case "total_withdrawals":
              return formatCurrency(investorStats.totalWithdrawals);
            default:
              return "—";
          }
        }
      }
    } catch {
      return "—";
    }
  },

  async resolveStatValue(input: {
    mode: "manual" | "automatic";
    manualValue?: string;
    automaticKey?: LandingAutomaticStatKey;
  }): Promise<string> {
    if (input.mode === "manual") {
      return input.manualValue?.trim() || "—";
    }
    if (!input.automaticKey) return "—";
    return this.resolveAutomaticValue(input.automaticKey);
  },
};
