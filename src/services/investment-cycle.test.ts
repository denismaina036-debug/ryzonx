import { beforeEach, describe, expect, it, vi } from "vitest";
import { memoryDb, type Row } from "./test-support/memory-db";
const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  prepare: vi.fn(),
  stop: vi.fn(),
  continue: vi.fn(),
  continueIntoCycle: vi.fn(),
  settlement: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.db }));
vi.mock("@/lib/auth/session", () => ({ requireAuth: async () => ({ id: "user" }), requireRole: async () => ({ id: "user" }) }));
vi.mock("@/lib/auth/pool-manager-access", () => ({ userOwnsPoolManager: async () => true }));
vi.mock("@/services/audit.service", () => ({ auditService: { log: vi.fn() } }));
vi.mock("@/services/strategy.service", () => ({ strategyService: { getById: async () => ({ status: "approved" }) } }));
vi.mock("@/services/trading-journal.service", () => ({ tradingJournalService: { getOrCreateForCycle: vi.fn() } }));
vi.mock("@/services/admin-notes.service", () => ({ adminNotesService: {} }));
vi.mock("@/lib/platform-events/publish", () => ({ publishPlatformEvent: vi.fn(), PLATFORM_EVENT_TYPES: {} }));
vi.mock("@/lib/platform-events/resolve-recipients", () => ({ resolvePoolManagerUserId: async () => "user" }));
vi.mock("@/services/pool-manager-performance-stats.service", () => ({ poolManagerPerformanceStatsService: { syncManager: async () => undefined } }));
vi.mock("@/services/investment-cycle-metrics.service", () => ({ investmentCycleMetricsService: { enrichCycles: async (cycles: unknown[]) => cycles } }));
vi.mock("@/services/pool-roi.service", () => ({ poolRoiService: { getCompleteMultipliers: async () => [{ investmentLevelId: "tier", multiplier: 2 }] } }));
vi.mock("@/services/profit-distribution.service", () => ({ profitDistributionService: { hasInvestorAllocationsForSettlement: async () => true, getByCycleId: mocks.settlement } }));
vi.mock("@/services/investment-engine/cycle-lifecycle-orchestrator.service", () => ({ cycleLifecycleOrchestrator: { onTradingStarted: vi.fn() } }));
vi.mock("@/services/investment-engine/cycle-investor-settlement.service", () => ({ cycleInvestorSettlementService: {
  createPendingChoicesForCycle: mocks.prepare,
  settleRequestedCopyStopsForCycle: mocks.stop,
  continuePendingCopyingIntoNextFundingCycle: mocks.continue,
  continuePendingCopyingIntoCycle: mocks.continueIntoCycle,
} }));
import { investmentCycleService } from "./investment-cycle.service";

let tables: Record<"funds" | "pool_managers" | "investment_cycles" | "trade_entries", Row[]>;
beforeEach(() => {
  vi.clearAllMocks();
  tables = {
    funds: [{ id: "fund", name: "Pool", slug: "pool", lifecycle_status: "live", pool_manager_id: "manager", pool_faq: { managedPool: { strategyId: "strategy" } } }],
    pool_managers: [{ id: "manager", user_id: "user", status: "approved" }],
    investment_cycles: [{ id: "c1", fund_id: "fund", pool_manager_id: "manager", status: "trading", cycle_number: 1, name: "Cycle 1" }],
    trade_entries: [1, 2, 3, 4].map(i => ({ id: `t${i}`, investment_cycle_id: "c1", status: "closed", realized_pnl: 100 })),
  };
  const db = memoryDb(tables) as ReturnType<typeof memoryDb> & {
    rpc: (name: string, args: { p_cycle_id?: string }) => Promise<{
      data: string | null;
      error: { message: string } | null;
    }>;
  };
  db.rpc = vi.fn(async (name, args) => {
    if (name !== "activate_investment_cycle_funding_atomic") {
      return { data: null, error: null };
    }
    const target = tables.investment_cycles.find((cycle) => cycle.id === args.p_cycle_id);
    if (!target) return { data: null, error: { message: "Investment cycle not found" } };
    const conflict = tables.investment_cycles.find(
      (cycle) =>
        cycle.fund_id === target.fund_id &&
        cycle.status === "funding" &&
        cycle.id !== target.id
    );
    if (conflict) {
      return {
        data: null,
        error: { message: "Another investment cycle is already accepting new copiers." },
      };
    }
    target.status = "funding";
    target.submitted_at ??= new Date().toISOString();
    target.approved_at ??= new Date().toISOString();
    target.funding_started_at ??= new Date().toISOString();
    return { data: String(target.id), error: null };
  });
  mocks.db.mockReturnValue(db);
  mocks.settlement.mockResolvedValue({ status: "completed" });
});
describe("cycle lifecycle", () => {
  const createInput = {
    fundId: "fund",
    name: "New opportunity",
    minInvestment: 100,
    targetCapital: 10000,
    targetInvestors: 10,
    returnDurationPreset: "daily" as const,
    returnDurationValue: 1,
    returnDurationUnit: "days" as const,
    roiMultipliers: [{ investmentLevelId: "tier", multiplier: 2 }],
  };

  it("selects the funding cycle rather than a trading sibling for new copiers", async () => {
    tables.investment_cycles.push({
      id: "c2",
      fund_id: "fund",
      pool_manager_id: "manager",
      status: "funding",
      cycle_number: 2,
      name: "Cycle 2",
    });

    expect((await investmentCycleService.getFundingForFund("fund"))?.id).toBe("c2");
  });

  it("does not treat a trading cycle as open for new copiers", async () => {
    await expect(investmentCycleService.getFundingForFund("fund")).resolves.toBeNull();
  });

  it("keeps selecting the current funding cycle when historical or draft cycles coexist", async () => {
    tables.investment_cycles[0]!.status = "completed";
    tables.investment_cycles.push(
      { id: "c2", fund_id: "fund", pool_manager_id: "manager", status: "funding", cycle_number: 2, name: "Cycle 2" },
      { id: "c3", fund_id: "fund", pool_manager_id: "manager", status: "draft", cycle_number: 3, name: "Cycle 3" },
    );

    expect((await investmentCycleService.getFundingForFund("fund"))?.id).toBe("c2");
  });

  it("moves new-copy eligibility to the next cycle after the current one starts trading", async () => {
    tables.investment_cycles.push(
      { id: "c2", fund_id: "fund", pool_manager_id: "manager", status: "trading", cycle_number: 2, name: "Cycle 2" },
      { id: "c3", fund_id: "fund", pool_manager_id: "manager", status: "funding", cycle_number: 3, name: "Cycle 3" },
    );

    expect((await investmentCycleService.getFundingForFund("fund"))?.id).toBe("c3");
  });

  it("allows drafts beside a funding cycle but prevents a second funding cycle", async () => {
    tables.investment_cycles[0]!.status = "funding";
    tables.investment_cycles.push({
      id: "c2",
      fund_id: "fund",
      pool_manager_id: "manager",
      status: "approved",
      cycle_number: 2,
      name: "Cycle 2",
    });

    await expect(investmentCycleService.transition("c2", "funding", "manager"))
      .rejects.toThrow("already accepting new copiers");
    expect(tables.investment_cycles[0]!.status).toBe("funding");
    expect(tables.investment_cycles[1]!.status).toBe("approved");
  });

  it("opens a newly created cycle when no funding cycle exists", async () => {
    const created = await investmentCycleService.createForLivePool(createInput);

    expect(created.status).toBe("funding");
    expect(tables.investment_cycles.filter((cycle) => cycle.status === "funding")).toHaveLength(1);
  });

  it("keeps a new cycle in draft while the current cycle is funding", async () => {
    tables.investment_cycles[0]!.status = "funding";

    const created = await investmentCycleService.createForLivePool(createInput);

    expect(created.status).toBe("draft");
    expect(tables.investment_cycles.filter((cycle) => cycle.status === "funding")).toHaveLength(1);
    expect(mocks.continueIntoCycle).not.toHaveBeenCalled();
  });

  it("does not make a missing legacy source allocation a cycle-creation failure", async () => {
    mocks.continueIntoCycle.mockRejectedValueOnce(new Error("Source copy allocation not found"));

    const created = await investmentCycleService.createForLivePool(createInput);

    expect(created.status).toBe("funding");
    expect(tables.investment_cycles.filter((cycle) => cycle.status === "funding")).toHaveLength(1);
  });

  it("keeps a duplicate creation request prepared behind one funding cycle", async () => {
    const first = await investmentCycleService.createForLivePool(createInput);
    const second = await investmentCycleService.createForLivePool({
      ...createInput,
      name: "Next opportunity",
    });

    expect(first.status).toBe("funding");
    expect(second.status).toBe("draft");
    expect(tables.investment_cycles.filter((cycle) => cycle.status === "funding")).toHaveLength(1);
  });

  it("creates independent cycles while existing groups are funding, trading, or distributing", async () => {
    for (const status of ["funding", "trading", "distribution", "draft"]) {
      tables.investment_cycles.at(-1)!.status = status;
      const before = structuredClone(tables.investment_cycles);
      const tradesBefore = structuredClone(tables.trade_entries);
      const created = await investmentCycleService.createFromPool(createInput);
      expect(created.cycleNumber).toBe(before.length + 1);
      expect(before.some(row => row.id === created.id)).toBe(false);
      expect(tables.investment_cycles.slice(0, -1)).toEqual(before);
      expect(tables.trade_entries).toEqual(tradesBefore);
    }
  });
  it("starts another cycle without modifying its trading sibling", async () => {
    const first = structuredClone(tables.investment_cycles[0]);
    tables.investment_cycles.push({ id: "c2", fund_id: "fund", pool_manager_id: "manager", status: "funding", cycle_number: 2 });
    expect((await investmentCycleService.transition("c2", "trading", "manager")).status).toBe("trading");
    expect(tables.investment_cycles[0]).toEqual(first);
  });
  it.each(["manager", "admin"] as const)("closes a cycle with four completed records as %s and settles stops before continuation", async actor => {
    tables.investment_cycles.push({ id: "c2", status: "trading", current_cycle_profit: 400 });
    const sibling = structuredClone(tables.investment_cycles[1]);
    expect((await investmentCycleService.closeCycle("c1", actor)).cycle.status).toBe("completed");
    expect(tables.investment_cycles[1]).toEqual(sibling);
    expect(mocks.prepare).toHaveBeenCalledWith("c1", "fund");
    expect(mocks.stop).toHaveBeenCalledWith("c1");
    expect(mocks.prepare.mock.invocationCallOrder[0]!).toBeLessThan(mocks.stop.mock.invocationCallOrder[0]!);
    expect(mocks.stop.mock.invocationCallOrder[0]!).toBeLessThan(mocks.continue.mock.invocationCallOrder[0]!);
  });
  it("still requires distribution before completion when investors participate", async () => {
    mocks.settlement.mockResolvedValue({ status: "pending_review" });
    await expect(investmentCycleService.closeCycle("c1", "manager")).rejects.toThrow("Distribute");
    expect(tables.investment_cycles[0]!.status).toBe("trading");
    expect(mocks.stop).not.toHaveBeenCalled();
  });
});
