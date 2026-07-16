import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";
import type {
  PoolStats,
  PerformanceSnapshot,
  Trade,
  JournalEntry,
  PaginatedResponse,
} from "@/types";

/**
 * Pool service — handles all fund/pool data operations.
 * Client-side service using Supabase with RLS enforcement.
 */
export const poolService = {
  async getStats(): Promise<PoolStats> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("pool_stats")
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Not found");

    const row = data as Tables<"pool_stats">;

    return {
      totalPoolValue: row.total_pool_value,
      totalActiveInvestors: row.total_active_investors,
      dailyRoi: row.daily_roi,
      weeklyRoi: row.weekly_roi,
      monthlyRoi: row.monthly_roi,
      totalClosedTrades: row.total_closed_trades,
      winRate: row.win_rate,
      totalDeposits: row.total_deposits,
      totalWithdrawals: row.total_withdrawals,
      updatedAt: row.updated_at,
    };
  },

  async getPerformanceHistory(
    period: "daily" | "weekly" | "monthly" = "daily"
  ): Promise<PerformanceSnapshot[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("performance_snapshots")
      .select("*")
      .order("date", { ascending: true })
      .limit(period === "daily" ? 30 : period === "weekly" ? 52 : 12);

    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => {
      const r = row as Tables<"performance_snapshots">;
      return {
      id: r.id,
      fundId: r.fund_id,
      date: r.date,
      poolValue: r.pool_value,
      dailyRoi: r.daily_roi,
      cumulativeRoi: r.cumulative_roi,
      createdAt: r.created_at,
    };
    });
  },

  async getTrades(
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResponse<Trade>> {
    const supabase = createClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from("trades")
      .select("*", { count: "exact" })
      .eq("status", "closed")
      .order("closed_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);

    const trades: Trade[] = (data ?? []).map((row) => {
      const r = row as Tables<"trades">;
      return {
      id: r.id,
      fundId: r.fund_id,
      symbol: r.symbol,
      direction: r.direction,
      entryPrice: r.entry_price,
      exitPrice: r.exit_price,
      quantity: r.quantity,
      pnl: r.pnl,
      pnlPercentage: r.pnl_percentage,
      status: r.status,
      openedAt: r.opened_at,
      closedAt: r.closed_at,
      notes: r.notes,
      publishedAt: r.published_at,
      createdAt: r.created_at,
    };
    });

    return {
      data: trades,
      pagination: {
        page,
        pageSize,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      },
    };
  },

  async getJournalEntries(
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResponse<JournalEntry>> {
    const supabase = createClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from("journal_entries")
      .select("*", { count: "exact" })
      .eq("is_public", true)
      .order("published_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);

    const entries: JournalEntry[] = (data ?? []).map((row) => {
      const r = row as Tables<"journal_entries">;
      return {
      id: r.id,
      tradeId: r.trade_id,
      title: r.title,
      content: r.content,
      sentiment: r.sentiment as JournalEntry["sentiment"],
      isPublic: r.is_public,
      publishedAt: r.published_at,
      createdAt: r.created_at,
    };
    });

    return {
      data: entries,
      pagination: {
        page,
        pageSize,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      },
    };
  },
};
