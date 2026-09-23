import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  upsert: vi.fn(),
  project: vi.fn(),
  trades: [] as Array<{ id: string; realized_pnl: number }>,
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: mocks.from }) }));
vi.mock("@/services/profit-distribution.service", () => ({
  profitDistributionService: { projectInvestorProfitForCycle: mocks.project },
}));

import {
  buildIncrementalCopierTradeResults,
  copierTradeResultService,
} from "./copier-trade-result.service";

function tradeQuery() {
  const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn() };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockResolvedValue({ data: mocks.trades, error: null });
  return query;
}

function cappedProjector(shares: Record<string, number>, caps: Record<string, number>) {
  return async (grossCyclePnl: number) =>
    Object.entries(shares).map(([allocationId, share]) => ({
      allocationId,
      investorId: `investor-${allocationId}`,
      projectedProfit: Math.max(
        -caps[allocationId]!,
        Math.min(caps[allocationId]!, grossCyclePnl * share)
      ),
    }));
}

describe("copier trade result persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.trades = [
      { id: "trade-1", realized_pnl: 100 },
      { id: "trade-2", realized_pnl: 50 },
    ];
    mocks.from.mockImplementation((table: string) =>
      table === "trade_entries" ? tradeQuery() : { upsert: mocks.upsert }
    );
    mocks.upsert.mockResolvedValue({ error: null });
    mocks.project.mockImplementation(async (_cycleId: string, gross: number) => [
      { allocationId: "a", investorId: "copier-a", projectedProfit: gross * 0.1 },
      { allocationId: "b", investorId: "copier-b", projectedProfit: gross * 0.2 },
    ]);
  });

  it("stores Trade 2 as the incremental change from the cumulative cycle result", async () => {
    await copierTradeResultService.recordForCompletedTrade({
      id: "trade-2",
      investmentCycleId: "cycle",
      status: "closed",
      realizedPnl: 50,
    } as never);

    expect(mocks.project).toHaveBeenNthCalledWith(1, "cycle", 100);
    expect(mocks.project).toHaveBeenNthCalledWith(2, "cycle", 150);
    expect(mocks.upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({ trade_entry_id: "trade-1", investment_allocation_id: "a", result_amount: 10 }),
        expect.objectContaining({ trade_entry_id: "trade-1", investment_allocation_id: "b", result_amount: 20 }),
        expect.objectContaining({ trade_entry_id: "trade-2", investment_allocation_id: "a", result_amount: 5 }),
        expect.objectContaining({ trade_entry_id: "trade-2", investment_allocation_id: "b", result_amount: 10 }),
      ],
      { onConflict: "trade_entry_id,investment_allocation_id" }
    );
    expect(mocks.from).not.toHaveBeenCalledWith("ledger_entries");
    expect(mocks.from).not.toHaveBeenCalledWith("investor_portfolios");
  });

  it("is retry-safe because recalculation upserts deterministic trade/allocation rows", async () => {
    const trade = { id: "trade-2", investmentCycleId: "cycle", status: "closed", realizedPnl: 50 } as never;
    await copierTradeResultService.recordForCompletedTrade(trade);
    await copierTradeResultService.recordForCompletedTrade(trade);
    expect(mocks.upsert).toHaveBeenCalledTimes(2);
    expect(mocks.upsert.mock.calls[0]).toEqual(mocks.upsert.mock.calls[1]);
  });
});

describe("multi-trade cumulative copier accounting", () => {
  it("records a zero Trade 2 delta when Trade 1 already reached the copier ROI cap", async () => {
    const rows = await buildIncrementalCopierTradeResults(
      "cycle",
      [
        { id: "trade-1", realized_pnl: 98_700 },
        { id: "trade-2", realized_pnl: 45_800 },
      ],
      cappedProjector({ ruth: 0.00329056 }, { ruth: 222 })
    );

    expect(rows.map((row) => ({ trade: row.trade_entry_id, amount: row.result_amount }))).toEqual([
      { trade: "trade-1", amount: 222 },
      { trade: "trade-2", amount: 0 },
    ]);
  });

  it("keeps four independent WIN, WIN, LOSS, WIN rows whose sum equals the final projection", async () => {
    const rows = await buildIncrementalCopierTradeResults(
      "cycle",
      [
        { id: "t1", realized_pnl: 100 },
        { id: "t2", realized_pnl: 60 },
        { id: "t3", realized_pnl: -40 },
        { id: "t4", realized_pnl: 80 },
      ],
      cappedProjector({ a: 0.1, b: 0.25 }, { a: 15, b: 100 })
    );

    expect(rows.filter((row) => row.investment_allocation_id === "a").map((row) => row.result_amount)).toEqual([10, 5, -3, 3]);
    expect(rows.filter((row) => row.investment_allocation_id === "b").map((row) => row.result_amount)).toEqual([25, 15, -10, 20]);
    expect(rows.filter((row) => row.investment_allocation_id === "a").reduce((sum, row) => sum + row.result_amount, 0)).toBe(15);
    expect(rows.filter((row) => row.investment_allocation_id === "b").reduce((sum, row) => sum + row.result_amount, 0)).toBe(50);
  });

  it.each([
    ["WIN → LOSS", [100, -40], [10, -4]],
    ["LOSS → WIN", [-40, 100], [-4, 10]],
    ["WIN → WIN", [100, 50], [10, 5]],
    ["LOSS → LOSS", [-40, -30], [-4, -3]],
  ])("reconciles %s without overwriting the first trade", async (_label, pnl, expected) => {
    const rows = await buildIncrementalCopierTradeResults(
      "cycle",
      pnl.map((realizedPnl, index) => ({ id: `t${index + 1}`, realized_pnl: realizedPnl })),
      cappedProjector({ a: 0.1 }, { a: 100 })
    );
    expect(rows.map((row) => row.result_amount)).toEqual(expected);
    expect(rows.reduce((sum, row) => sum + row.result_amount, 0)).toBe(
      Math.max(-100, Math.min(100, pnl.reduce((sum, value) => sum + value, 0) * 0.1))
    );
  });
});
