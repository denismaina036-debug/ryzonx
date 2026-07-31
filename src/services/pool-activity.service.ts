import { createAdminClient } from "@/lib/supabase/admin";
import { INVESTMENT_CYCLE_PUBLIC_STATUSES } from "@/constants/investment-cycle";
import type { InvestmentCycleStatus } from "@/constants/investment-cycle";
import type {
  PoolActivityCycleSummary,
  PoolActivityPageData,
} from "@/domain/marketplace/pool-activity";
import type { PublicPoolTradeView } from "@/domain/trading-journal/types";
import { tradeEntryService } from "@/services/trade-entry.service";
import { investmentCycleService } from "@/services/investment-cycle.service";

const JOURNAL_TRADE_LIMIT = 1000;

type FundRow = {
  id: string;
  slug: string;
  name: string;
  is_marketplace_listed?: boolean;
  lifecycle_status?: string;
  status?: string;
};

type TradeRow = {
  id: string;
  trade_reference: string;
  instrument: string;
  direction: "long" | "short";
  entry_price: number | string;
  exit_price: number | string | null;
  quantity: number | string;
  trade_result: "profit" | "loss" | "breakeven" | null;
  realized_pnl: number | string | null;
  screenshot_url: string | null;
  closed_at: string | null;
  investment_cycle_id: string;
};

type CycleRow = {
  id: string;
  cycle_number: number;
  name: string;
  status: InvestmentCycleStatus;
  current_cycle_profit?: number | string | null;
};

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function mapPublicTrade(row: TradeRow, cycle: CycleRow): PublicPoolTradeView {
  return {
    id: row.id,
    tradeReference: row.trade_reference,
    instrument: row.instrument,
    direction: row.direction,
    entryPrice: toNumber(row.entry_price),
    exitPrice: row.exit_price != null ? toNumber(row.exit_price) : null,
    quantity: toNumber(row.quantity),
    tradeResult: row.trade_result,
    realizedPnl: row.realized_pnl != null ? toNumber(row.realized_pnl) : null,
    screenshotUrl: row.screenshot_url,
    closedAt: row.closed_at,
    investmentCycleId: cycle.id,
    cycleNumber: cycle.cycle_number,
    cycleName: cycle.name?.trim() || `Cycle ${cycle.cycle_number}`,
    cycleStatus: cycle.status,
  };
}

async function assertPublicFund(fundId: string): Promise<boolean> {
  const db = createAdminClient();
  const { data } = await db
    .from("funds")
    .select("is_marketplace_listed, lifecycle_status, status")
    .eq("id", fundId)
    .maybeSingle();
  const fund = data as {
    is_marketplace_listed?: boolean;
    lifecycle_status?: string;
    status?: string;
  } | null;
  return Boolean(
    fund?.is_marketplace_listed && fund.lifecycle_status === "live" && fund.status === "active"
  );
}

export const poolActivityService = {
  async getPageDataByPoolSlug(slug: string): Promise<PoolActivityPageData | null> {
    const db = createAdminClient();
    const { data: fundRow, error } = await db
      .from("funds")
      .select("id, slug, name, is_marketplace_listed, lifecycle_status, status")
      .eq("slug", slug)
      .eq("is_marketplace_listed", true)
      .eq("lifecycle_status", "live")
      .eq("status", "active")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!fundRow) return null;

    const fund = fundRow as FundRow;
    return this.getPageDataByFundId(fund.id, fund);
  },

  async getPageDataByFundId(fundId: string, fundMeta?: FundRow): Promise<PoolActivityPageData | null> {
    if (!(await assertPublicFund(fundId))) return null;

    const db = createAdminClient();
    let fund = fundMeta;
    if (!fund) {
      const { data } = await db.from("funds").select("*").eq("id", fundId).maybeSingle();
      if (!data) return null;
      fund = data as FundRow;
    }

    const cycles = await investmentCycleService.listByFund(fundId);
    const publicCycles = cycles.filter((c) =>
      INVESTMENT_CYCLE_PUBLIC_STATUSES.includes(c.status as InvestmentCycleStatus)
    );

    const activeCycleRaw =
      publicCycles.find((c) => ["funding", "trading", "distribution"].includes(c.status)) ??
      publicCycles[0] ??
      null;

    const cycleIds = publicCycles.map((c) => c.id);
    const journalTrades =
      cycleIds.length > 0
        ? await this.listPublicClosedTradesForCycles(cycleIds, JOURNAL_TRADE_LIMIT)
        : [];

    const tradeCountByCycle = new Map<string, number>();
    for (const trade of journalTrades) {
      tradeCountByCycle.set(
        trade.investmentCycleId,
        (tradeCountByCycle.get(trade.investmentCycleId) ?? 0) + 1
      );
    }

    const cycleSummaries: PoolActivityCycleSummary[] = await Promise.all(
      publicCycles.map(async (cycle) => {
        const profit = await tradeEntryService.sumRealizedProfitForCyclePublic(cycle.id);
        return {
          id: cycle.id,
          cycleNumber: cycle.cycleNumber,
          name: cycle.name?.trim() || `Cycle ${cycle.cycleNumber}`,
          status: cycle.status as InvestmentCycleStatus,
          tradeCount: tradeCountByCycle.get(cycle.id) ?? 0,
          cycleProfit: profit,
        };
      })
    );

    cycleSummaries.sort((a, b) => b.cycleNumber - a.cycleNumber);

    const activeCycle = activeCycleRaw
      ? cycleSummaries.find((c) => c.id === activeCycleRaw.id) ?? null
      : null;

    const currentCycleTrades = activeCycle
      ? journalTrades.filter((t) => t.investmentCycleId === activeCycle.id)
      : [];

    return {
      poolId: fund.id,
      poolSlug: fund.slug,
      poolName: fund.name,
      displayPoolName: fund.name,
      activeCycle,
      currentCycleTrades,
      cycles: cycleSummaries,
      journalTrades,
    };
  },

  async listPublicClosedTradesForCycles(
    cycleIds: string[],
    limit = JOURNAL_TRADE_LIMIT
  ): Promise<PublicPoolTradeView[]> {
    if (cycleIds.length === 0) return [];

    const db = createAdminClient();
    const { data: cycleRows, error: cycleError } = await db
      .from("investment_cycles")
      .select("id, cycle_number, name, status, current_cycle_profit, fund_id")
      .in("id", cycleIds);

    if (cycleError) throw new Error(cycleError.message);

    const cycleMap = new Map(
      ((cycleRows ?? []) as Array<CycleRow & { fund_id: string }>).map((row) => [row.id, row])
    );

    const fundIds = [...new Set(((cycleRows ?? []) as Array<{ fund_id: string }>).map((r) => r.fund_id))];
    for (const fundId of fundIds) {
      if (!(await assertPublicFund(fundId))) return [];
    }

    const { data: trades, error } = await db
      .from("trade_entries")
      .select("*")
      .in("investment_cycle_id", cycleIds)
      .eq("status", "closed")
      .eq("investor_visible", true)
      .not("closed_at", "is", null)
      .order("closed_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);

    return ((trades ?? []) as TradeRow[])
      .map((row) => {
        const cycle = cycleMap.get(row.investment_cycle_id);
        if (!cycle) return null;
        return mapPublicTrade(row, cycle);
      })
      .filter((t): t is PublicPoolTradeView => t != null);
  },
};
