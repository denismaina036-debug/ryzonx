import { createAdminClient } from "@/lib/supabase/admin";
import {
  resolvePoolManagerPublicLabel,
  managerRowToIdentity,
} from "@/domain/pool-manager/public-profile";
import type { TradeEntryResult, TradeEntryStatus } from "@/constants/trade-entry";
import type {
  InvestorDashboardTrade,
  InvestorTradeDisplayStatus,
} from "@/features/investor/types";

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
  fund: FundRow | undefined
): InvestorDashboardTrade {
  const entryPrice = toNumber(row.entry_price);
  const exitPrice = row.exit_price != null ? toNumber(row.exit_price) : null;
  const quantity = toNumber(row.quantity);
  const isActive = row.status === "open" || row.status === "partially_closed";
  const currentPrice = exitPrice ?? entryPrice;
  const managerPhotoUrl = manager?.profile_photo_url ?? manager?.icon_url ?? null;

  return {
    id: row.id,
    asset: row.instrument,
    direction: row.direction,
    entryPrice,
    currentPrice,
    investedAmount: roundMoney(entryPrice * quantity),
    profitLoss: row.realized_pnl != null ? toNumber(row.realized_pnl) : 0,
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
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export const investorPoolTradesService = {
  /** Pool manager journal trades visible to investors across marketplace pools. */
  async listForFunds(fundIds: string[], limit = 100): Promise<InvestorDashboardTrade[]> {
    if (fundIds.length === 0) return [];

    const db = createAdminClient();
    const { data: cycles, error: cycleError } = await db
      .from("investment_cycles")
      .select("id, fund_id")
      .in("fund_id", fundIds);

    if (cycleError) throw new Error(cycleError.message);

    const cycleRows = (cycles ?? []) as CycleRow[];
    const cycleIds = cycleRows.map((row) => row.id);
    if (cycleIds.length === 0) return [];

    const cycleMap = new Map(cycleRows.map((row) => [row.id, row]));

    const { data: trades, error } = await db
      .from("trade_entries")
      .select(
        "id, pool_manager_id, investment_cycle_id, trade_reference, instrument, direction, entry_price, exit_price, quantity, status, trade_result, realized_pnl, screenshot_url, opened_at, closed_at, created_at"
      )
      .in("investment_cycle_id", cycleIds)
      .eq("investor_visible", true)
      .in("status", ["open", "partially_closed", "closed"])
      .order("closed_at", { ascending: false, nullsFirst: false })
      .order("opened_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) throw new Error(error.message);

    const tradeRows = (trades ?? []) as JournalTradeRow[];
    if (tradeRows.length === 0) return [];

    const managerIds = [...new Set(tradeRows.map((row) => row.pool_manager_id))];
    const relevantFundIds = [...new Set(cycleRows.map((row) => row.fund_id))];

    const [managersResult, fundsResult] = await Promise.all([
      db
        .from("pool_managers")
        .select("id, username, slug, display_name, show_full_name, profile_photo_url, icon_url")
        .in("id", managerIds),
      db.from("funds").select("id, name").in("id", relevantFundIds),
    ]);

    const managerMap = new Map(
      ((managersResult.data ?? []) as ManagerRow[]).map((row) => [row.id, row])
    );
    const fundMap = new Map(
      ((fundsResult.data ?? []) as FundRow[]).map((row) => [row.id, row])
    );

    return tradeRows
      .map((row) => {
        const cycle = cycleMap.get(row.investment_cycle_id);
        if (!cycle) return null;
        return mapJournalTradeRow(
          row,
          cycle,
          managerMap.get(row.pool_manager_id),
          fundMap.get(cycle.fund_id)
        );
      })
      .filter((trade): trade is InvestorDashboardTrade => trade != null)
      .sort((a, b) => {
        const aTime = new Date(a.closedAt ?? a.openedAt).getTime();
        const bTime = new Date(b.closedAt ?? b.openedAt).getTime();
        return bTime - aTime;
      });
  },
};
