import { createAdminClient } from "@/lib/supabase/admin";
import { INVESTMENT_CYCLE_PUBLIC_STATUSES } from "@/constants/investment-cycle";
import type { InvestmentCycleStatus } from "@/constants/investment-cycle";
import type { PublicJournalTrade } from "@/domain/trading-journal/types";
import {
  resolvePoolManagerPublicLabel,
  managerRowToIdentity,
} from "@/domain/pool-manager/public-profile";

const DEFAULT_LIMIT = 1000;

type FundRow = {
  id: string;
  name: string;
  slug: string;
};

type CycleRow = {
  id: string;
  fund_id: string;
  cycle_number: number;
  name: string | null;
  pool_manager_id: string;
  status: InvestmentCycleStatus;
};

type TradeRow = {
  id: string;
  pool_manager_id: string;
  investment_cycle_id: string;
  trade_reference: string;
  instrument: string;
  direction: "long" | "short";
  realized_pnl: number | string | null;
  opened_at: string | null;
  closed_at: string | null;
  created_at: string;
};

type ManagerRow = {
  id: string;
  username?: string | null;
  slug: string | null;
  display_name: string;
  show_full_name?: boolean | null;
};

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function mapTradeRow(
  row: TradeRow,
  cycle: CycleRow,
  fund: FundRow,
  manager: ManagerRow | undefined
): PublicJournalTrade {
  return {
    id: row.id,
    symbol: row.instrument,
    direction: row.direction,
    realizedPnl: row.realized_pnl != null ? toNumber(row.realized_pnl) : null,
    status: "closed",
    openedAt: row.opened_at ?? row.created_at,
    closedAt: row.closed_at,
    poolName: fund.name,
    poolSlug: fund.slug,
    poolManagerName: manager
      ? resolvePoolManagerPublicLabel(managerRowToIdentity(manager))
      : "Pool Manager",
    poolManagerSlug: manager?.slug ?? null,
    cycleName: cycle.name?.trim() || `Cycle ${cycle.cycle_number}`,
    cycleNumber: cycle.cycle_number,
    tradeReference: row.trade_reference,
  };
}

export const publicJournalService = {
  async listTrades(limit = DEFAULT_LIMIT): Promise<PublicJournalTrade[]> {
    const db = createAdminClient();

    const { data: fundRows, error: fundError } = await db
      .from("funds")
      .select("id, name, slug")
      .eq("is_marketplace_listed", true)
      .eq("lifecycle_status", "live")
      .eq("status", "active");

    if (fundError) throw new Error(fundError.message);

    const funds = (fundRows ?? []) as FundRow[];
    if (funds.length === 0) return [];

    const fundMap = new Map(funds.map((f) => [f.id, f]));
    const fundIds = funds.map((f) => f.id);

    const { data: cycleRows, error: cycleError } = await db
      .from("investment_cycles")
      .select("id, fund_id, cycle_number, name, pool_manager_id, status")
      .in("fund_id", fundIds)
      .in("status", [...INVESTMENT_CYCLE_PUBLIC_STATUSES]);

    if (cycleError) throw new Error(cycleError.message);

    const cycles = (cycleRows ?? []) as CycleRow[];
    const cycleIds = cycles.map((c) => c.id);
    if (cycleIds.length === 0) return [];

    const cycleMap = new Map(cycles.map((c) => [c.id, c]));

    const { data: tradeRows, error: tradeError } = await db
      .from("trade_entries")
      .select(
        "id, pool_manager_id, investment_cycle_id, trade_reference, instrument, direction, realized_pnl, opened_at, closed_at, created_at"
      )
      .in("investment_cycle_id", cycleIds)
      .eq("status", "closed")
      .eq("investor_visible", true)
      .not("closed_at", "is", null)
      .order("closed_at", { ascending: false })
      .limit(limit);

    if (tradeError) throw new Error(tradeError.message);

    const trades = (tradeRows ?? []) as TradeRow[];
    if (trades.length === 0) return [];

    const managerIds = [...new Set(trades.map((t) => t.pool_manager_id))];
    const { data: managerRows } = await db
      .from("pool_managers")
      .select("id, username, slug, display_name, show_full_name")
      .in("id", managerIds);

    const managerMap = new Map(
      ((managerRows ?? []) as ManagerRow[]).map((row) => [row.id, row])
    );

    return trades
      .map((row) => {
        const cycle = cycleMap.get(row.investment_cycle_id);
        if (!cycle) return null;
        const fund = fundMap.get(cycle.fund_id);
        if (!fund) return null;
        return mapTradeRow(row, cycle, fund, managerMap.get(row.pool_manager_id));
      })
      .filter((trade): trade is PublicJournalTrade => trade != null);
  },

  async listRecent(limit = 5): Promise<PublicJournalTrade[]> {
    return this.listTrades(Math.max(limit, 5)).then((trades) => trades.slice(0, limit));
  },
};
