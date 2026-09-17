import { beforeEach, describe, expect, it, vi } from "vitest";
import { memoryDb, type Row } from "./test-support/memory-db";

const mocks = vi.hoisted(() => ({ db: vi.fn(), cycle: vi.fn(), trades: vi.fn(), credit: vi.fn(), ledger: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.db }));
vi.mock("@/lib/auth/session", () => ({ requireAuth: vi.fn(), requireRole: vi.fn() }));
vi.mock("@/lib/auth/pool-manager-access", () => ({ userOwnsPoolManager: vi.fn() }));
vi.mock("@/services/investment-cycle.service", () => ({ investmentCycleService: { getById: mocks.cycle } }));
vi.mock("@/services/trade-entry.service", () => ({ tradeEntryService: { listByCycleInternal: mocks.trades } }));
vi.mock("@/services/investment-allocation.service", () => ({ investmentAllocationService: {} }));
vi.mock("@/services/pool-roi.service", () => ({ poolRoiService: {} }));
vi.mock("@/services/platform-settings.service", () => ({ platformSettingsService: {} }));
vi.mock("@/services/audit.service", () => ({ auditService: { log: vi.fn() } }));
vi.mock("@/services/investment-engine/cycle-ownership.service", () => ({ cycleOwnershipService: {} }));
vi.mock("@/services/investment-engine/investor-profit-wallet.service", () => ({ investorProfitWalletService: { credit: mocks.credit } }));
vi.mock("@/services/investment-engine/cycle-lifecycle-orchestrator.service", () => ({ cycleLifecycleOrchestrator: { onSettlementDistributed: vi.fn() } }));
vi.mock("@/services/ledger.service", () => ({ ledgerService: { postTransaction: mocks.ledger } }));
vi.mock("@/services/ledger-account.service", () => ({ ledgerAccountService: {
  ensureCycleProfitPayableAccount: async () => ({ id: "payable" }),
  ensureInvestorPoolProfitAccount: async () => ({ id: "profit" }),
} }));
vi.mock("@/lib/transaction/insert", () => ({ attachTransactionReference: vi.fn() }));
vi.mock("@/lib/platform-events/publish", () => ({ publishPlatformEvent: vi.fn(), PLATFORM_EVENT_TYPES: {} }));
import { profitDistributionService } from "./profit-distribution.service";

let tables: Record<"funds" | "profit_settlements" | "profit_settlement_allocations" | "investment_allocations" | "investor_portfolios", Row[]>;
beforeEach(() => {
  vi.clearAllMocks();
  tables = {
    funds: [{ id: "fund", name: "Pool" }],
    profit_settlements: [1, 2].map(i => ({ id: `s${i}`, investment_cycle_id: `c${i}`, pool_manager_id: "manager", fund_id: "fund", status: "confirmed", gross_trading_profit: 250 })),
    profit_settlement_allocations: [1, 2].map(i => ({ id: `p${i}`, profit_settlement_id: `s${i}`, investment_allocation_id: `a${i}`, investor_id: `i${i}`, status: "pending", profit_share: 200 })),
    investment_allocations: [1, 2].map(i => ({ id: `a${i}`, investment_cycle_id: `c${i}`, investor_id: `i${i}`, amount: 1000, roi_multiplier: 2, cumulative_realised_return: 0, target_fulfilled: false })),
    investor_portfolios: [1, 2].map(i => ({ id: `v${i}`, user_id: `i${i}`, fund_id: "fund", total_invested: 1000, current_value: 1000 })),
  };
  mocks.db.mockReturnValue(memoryDb(tables));
  mocks.cycle.mockImplementation(async (id: string) => ({ id, name: id, status: "trading", poolManagerId: "manager", fundId: "fund", currentCycleProfit: 9999 }));
  mocks.credit.mockResolvedValue({ balance: 200 });
  mocks.ledger.mockResolvedValue({ transaction: { id: "ledger-credit" } });
});
describe("cycle settlement boundaries", () => {
  it("uses cycle journal totals instead of a stale nonzero cached profit", async () => {
    mocks.trades.mockImplementation(async (id: string) => (id === "c1" ? [100, 200, -50] : [500, -100]).map(realizedPnl => ({ status: "closed", realizedPnl })));
    expect(await profitDistributionService.getCycleGrossTradingProfit("c1")).toBe(250);
    expect(await profitDistributionService.getCycleGrossTradingProfit("c2")).toBe(400);
  });
  it("distributes only cycle 1 allocations and repeated finalization does not credit again", async () => {
    const other = structuredClone({ settlement: tables.profit_settlements[1], allocation: tables.investment_allocations[1], profit: tables.profit_settlement_allocations[1], portfolio: tables.investor_portfolios[1] });
    await profitDistributionService.finalizeCycleProfits("c1", "actor");
    await profitDistributionService.finalizeCycleProfits("c1", "actor");
    expect(mocks.credit).toHaveBeenCalledExactlyOnceWith("i1", "fund", 200, "c1", "profit-allocation:p1:wallet-credit");
    expect(mocks.ledger).toHaveBeenCalledTimes(1);
    expect(mocks.ledger.mock.calls[0]![0]).toMatchObject({ idempotencyKey: "profit-allocation:p1:ledger-credit", metadata: { cycleId: "c1", settlementId: "s1" } });
    expect({ settlement: tables.profit_settlements[1], allocation: tables.investment_allocations[1], profit: tables.profit_settlement_allocations[1], portfolio: tables.investor_portfolios[1] }).toEqual(other);
    expect(tables.profit_settlements[0]!.status).toBe("completed");
  });
});
