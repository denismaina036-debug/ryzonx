import { createAdminClient } from "@/lib/supabase/admin";
import { hasMeaningfulTradePrices } from "@/lib/trading/trade-display";
import {
  resolvePoolManagerPublicLabel,
  managerRowToIdentity,
} from "@/domain/pool-manager/public-profile";
import type { TradeEntryResult, TradeEntryStatus } from "@/constants/trade-entry";
import type {
  InvestorDashboardTrade,
  InvestorTradeDisplayStatus,
} from "@/features/investor/types";
import {
  mergeAuthoritativeCopierTradeResults,
  selectAuthoritativeCopierTradeRows,
  type CopierLossAllocation,
  type CopierProfitAllocation,
} from "@/lib/investor/copier-trade-history";

type JournalTradeRow = {
  id: string;
  pool_manager_id: string;
  investment_cycle_id: string;
  trade_reference: string;
  instrument: string;
  direction: "long" | "short";
  entry_price: number | string;
  exit_price: number | string | null;
  quantity: number | string;
  status: TradeEntryStatus;
  trade_result: TradeEntryResult | null;
  realized_pnl: number | string | null;
  screenshot_url: string | null;
  opened_at: string | null;
  closed_at: string | null;
  created_at: string;
};

type CycleRow = {
  id: string;
  fund_id: string;
};

type ManagerRow = {
  id: string;
  username?: string | null;
  slug: string | null;
  display_name: string;
  show_full_name?: boolean | null;
  profile_photo_url: string | null;
  icon_url: string | null;
};

type FundRow = {
  id: string;
  name: string;
};

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function mapJournalTradeStatus(
  status: TradeEntryStatus,
  result: TradeEntryResult | null
): InvestorTradeDisplayStatus {
  if (status === "open") return "running";
  if (status === "partially_closed") return "partials_taken";
  if (status === "closed") {
    if (result === "profit") return "take_profit_hit";
    if (result === "loss") return "stop_loss_hit";
    if (result === "breakeven") return "breakeven";
    return "closed";
  }
  return "closed";
}

function mapJournalTradeRow(
  row: JournalTradeRow,
  cycle: CycleRow,
  manager: ManagerRow | undefined,
  fund: FundRow | undefined,
  copierProfitLoss: number
): InvestorDashboardTrade {
  const entryPrice = toNumber(row.entry_price);
  const exitPrice = row.exit_price != null ? toNumber(row.exit_price) : null;
  const quantity = toNumber(row.quantity);
  const isActive = row.status === "open" || row.status === "partially_closed";
  const currentPrice = exitPrice ?? entryPrice;
  const managerPhotoUrl = manager?.profile_photo_url ?? manager?.icon_url ?? null;
  const showPriceDetails = hasMeaningfulTradePrices(
    entryPrice,
    exitPrice,
    quantity
  );

  return {
    id: row.id,
    asset: row.instrument,
    direction: row.direction,
    entryPrice,
    currentPrice,
    investedAmount: roundMoney(entryPrice * quantity),
    profitLoss: copierProfitLoss,
    status: mapJournalTradeStatus(row.status, row.trade_result),
    isActive,
    chartScreenshotUrl: row.screenshot_url,
    openedAt: row.opened_at ?? row.created_at,
    closedAt: row.closed_at,
    tradeReference: row.trade_reference,
    poolId: cycle.fund_id,
    poolName: fund?.name ?? null,
    poolManagerId: row.pool_manager_id,
    poolManagerName: manager
      ? resolvePoolManagerPublicLabel(managerRowToIdentity(manager))
      : null,
    poolManagerSlug: manager?.slug ?? null,
    poolManagerPhotoUrl: managerPhotoUrl,
    showPriceDetails,
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export const investorPoolTradesService = {
  /**
   * Permanent trade history derived from authoritative per-trade allocations.
   * Current copy status is deliberately irrelevant: historical rows survive a
   * stop, while later trades have no allocation row for the former copier.
   */
  async listForInvestor(
    investorId: string,
    limit = 100
  ): Promise<InvestorDashboardTrade[]> {
    const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);
    const db = createAdminClient();
    const [profitResult, lossResult] = await Promise.all([
      db
        .from("trade_profit_allocations" as never)
        .select("trade_entry_id, profit_amount, created_at" as never)
        .eq("investor_id" as never, investorId as never)
        .order("created_at" as never, { ascending: false })
        .limit(boundedLimit),
      db
        .from("trade_loss_allocations" as never)
        .select("trade_entry_id, loss_amount, created_at" as never)
        .eq("investor_id" as never, investorId as never)
        .order("created_at" as never, { ascending: false })
        .limit(boundedLimit),
    ]);

    if (profitResult.error) throw new Error(profitResult.error.message);
    if (lossResult.error) throw new Error(lossResult.error.message);

    const copierResults = mergeAuthoritativeCopierTradeResults(
      (profitResult.data ?? []) as unknown as CopierProfitAllocation[],
      (lossResult.data ?? []) as unknown as CopierLossAllocation[]
    );
    const tradeIds = [...copierResults.keys()];
    if (tradeIds.length === 0) return [];

    const { data: trades, error } = await db
      .from("trade_entries")
      .select(
        "id, pool_manager_id, investment_cycle_id, trade_reference, instrument, direction, entry_price, exit_price, quantity, status, trade_result, realized_pnl, screenshot_url, opened_at, closed_at, created_at"
      )
      .in("id", tradeIds)
      .eq("investor_visible", true)
      .eq("status", "closed")
      .not("closed_at", "is", null)
      .order("closed_at", { ascending: false });

    if (error) throw new Error(error.message);

    const tradeRows = (trades ?? []) as JournalTradeRow[];
    if (tradeRows.length === 0) return [];

    const managerIds = [...new Set(tradeRows.map((row) => row.pool_manager_id))];
    const cycleIds = [...new Set(tradeRows.map((row) => row.investment_cycle_id))];

    const [managersResult, cyclesResult] = await Promise.all([
      db
        .from("pool_managers")
        .select("id, username, slug, display_name, show_full_name, profile_photo_url, icon_url")
        .in("id", managerIds),
      db.from("investment_cycles").select("id, fund_id").in("id", cycleIds),
    ]);
    if (managersResult.error) throw new Error(managersResult.error.message);
    if (cyclesResult.error) throw new Error(cyclesResult.error.message);

    const cycleRows = (cyclesResult.data ?? []) as CycleRow[];
    const cycleMap = new Map(cycleRows.map((row) => [row.id, row]));
    const relevantFundIds = [...new Set(cycleRows.map((row) => row.fund_id))];
    const fundsResult = await db.from("funds").select("id, name").in("id", relevantFundIds);
    if (fundsResult.error) throw new Error(fundsResult.error.message);

    const managerMap = new Map(
      ((managersResult.data ?? []) as ManagerRow[]).map((row) => [row.id, row])
    );
    const fundMap = new Map(
      ((fundsResult.data ?? []) as FundRow[]).map((row) => [row.id, row])
    );

    return selectAuthoritativeCopierTradeRows(tradeRows, copierResults, boundedLimit)
      .map((row) => {
        const copierProfitLoss = copierResults.get(row.id);
        if (copierProfitLoss == null) return null;
        const cycle = cycleMap.get(row.investment_cycle_id);
        if (!cycle) return null;
        return mapJournalTradeRow(
          row,
          cycle,
          managerMap.get(row.pool_manager_id),
          fundMap.get(cycle.fund_id),
          copierProfitLoss
        );
      })
      .filter((trade): trade is InvestorDashboardTrade => trade != null);
  },
};
