import { beforeEach, describe, expect, it, vi } from "vitest";
import { memoryDb, type Row } from "./test-support/memory-db";

const mocks = vi.hoisted(() => ({ db: vi.fn(), audit: vi.fn(), cycle: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.db }));
vi.mock("@/lib/auth/session", () => ({ requireRole: async () => ({ id: "manager-user" }) }));
vi.mock("@/services/audit.service", () => ({ auditService: { log: mocks.audit } }));
vi.mock("@/services/investment-cycle.service", () => ({ investmentCycleService: { getByIdForManager: mocks.cycle, getById: mocks.cycle } }));
vi.mock("@/services/trading-journal.service", () => ({ tradingJournalService: {
  assertCycleJournalWritable: vi.fn(), getForManager: vi.fn(),
  getOrCreateForCycle: async (id: string) => ({ id: `journal-${id}`, poolManagerId: "manager" }),
} }));
vi.mock("@/services/cycle-progress.service", () => ({ cycleProgressService: { recordTradeClosed: vi.fn() } }));
vi.mock("@/lib/platform-events/publish", () => ({ publishPlatformEvent: vi.fn(), PLATFORM_EVENT_TYPES: {} }));
vi.mock("@/lib/platform-events/resolve-recipients", () => ({ resolveCycleManagerUserId: async () => "manager-user" }));
vi.mock("@/services/trade-loss-allocation.service", () => ({ tradeLossAllocationService: {
  resolveTradeResult: (pnl: number) => pnl > 0 ? "profit" : pnl < 0 ? "loss" : "breakeven",
} }));
vi.mock("@/services/pool-manager-performance-stats.service", () => ({ poolManagerPerformanceStatsService: { syncManager: async () => undefined } }));

import { tradeEntryService } from "./trade-entry.service";
import { cycleProfitService } from "./investment-engine/cycle-profit.service";

let tables: Record<"pool_managers" | "investment_cycles" | "trade_entries", Row[]>;
beforeEach(() => {
  vi.clearAllMocks();
  tables = {
    pool_managers: [{ id: "manager", user_id: "manager-user", status: "approved" }],
    investment_cycles: [{ id: "c1", current_cycle_profit: 0 }, { id: "c2", current_cycle_profit: 0 }],
    trade_entries: [],
  };
  mocks.db.mockReturnValue(memoryDb(tables));
  mocks.cycle.mockResolvedValue({ status: "trading", raisedCapital: 10000 });
  mocks.audit.mockResolvedValue(undefined);
});
const record = (cycle: string, pnl: number) => tradeEntryService.recordCompletedTrade(cycle, {
  instrument: "XAUUSD", amountUsd: Math.abs(pnl), tradeResult: pnl < 0 ? "loss" : "profit",
});

describe("manual completed results", () => {
  it("saves XAUUSD +100 directly as closed with completion timestamps", async () => {
    const entry = await record("c1", 100);
    expect(entry).toMatchObject({ status: "closed", realizedPnl: 100, investmentCycleId: "c1" });
    expect(entry.closedAt).toBeTruthy();
    expect(entry.openedAt).toBeTruthy();
    expect(tables.trade_entries).toHaveLength(1);
    expect(await tradeEntryService.listOpenByCycle("c1")).toEqual([]);
  });
  it("keeps entered prices while the dollar result remains authoritative", async () => {
    const entry = await tradeEntryService.recordCompletedTrade("c1", {
      instrument: "XAU/USD",
      direction: "long",
      entryPrice: 3650,
      exitPrice: 3670,
      amountUsd: 1000,
      tradeResult: "profit",
    });

    expect(entry).toMatchObject({
      entryPrice: 3650,
      exitPrice: 3670,
      realizedPnl: 1000,
      screenshotUrl: null,
    });
  });
  it("records four completed results without any intermediate open positions", async () => {
    for (const pnl of [200, -50, 100, 25]) await record("c1", pnl);
    expect(await tradeEntryService.listOpenByCycle("c1")).toEqual([]);
    expect(await tradeEntryService.listClosedByCycle("c1")).toHaveLength(4);
    expect(await cycleProfitService.getCycleProfit("c1")).toBe(275);
  });
  it("keeps +250 and +400 results in their respective cycles", async () => {
    for (const pnl of [100, 200, -50]) await record("c1", pnl);
    const first = structuredClone(tables.trade_entries);
    for (const pnl of [500, -100]) await record("c2", pnl);
    expect(tables.trade_entries.slice(0, 3)).toEqual(first);
    expect(await cycleProfitService.getCycleProfit("c1")).toBe(250);
    expect(await cycleProfitService.getCycleProfit("c2")).toBe(400);
  });
  it("does not leave a draft or open record when final-result validation fails", async () => {
    await expect(record("c1", -20000)).rejects.toThrow();
    await expect(tradeEntryService.recordCompletedTrade("c1", { instrument: "XAUUSD", amountUsd: 100 })).rejects.toThrow();
    expect(tables.trade_entries).toEqual([]);
  });
  it("validates losses against total cycle capital rather than copier commitments", async () => {
    mocks.cycle.mockResolvedValue({ status: "trading", raisedCapital: 12_776.7 });

    await expect(record("c1", -12_776.7)).resolves.toMatchObject({ realizedPnl: -12_776.7 });
    await expect(record("c2", -12_776.71)).rejects.toThrow(
      "A recorded loss cannot exceed the total capital traded in the cycle."
    );
  });
  it("a failure after the insert still leaves a completed record", async () => {
    mocks.audit.mockRejectedValueOnce(new Error("audit unavailable"));
    await expect(record("c1", 100)).rejects.toThrow("audit unavailable");
    expect(tables.trade_entries).toHaveLength(1);
    expect(tables.trade_entries[0]).toMatchObject({ status: "closed", realized_pnl: 100 });
  });
  it("preserves the price-based historical-result formula", async () => {
    const result = await tradeEntryService.recordCompletedTrade("c1", {
      instrument: "EURUSD", direction: "short", entryPrice: 10, exitPrice: 8, quantity: 5,
    });
    expect(result.realizedPnl).toBe(10);
    expect(result.status).toBe("closed");
  });
});
