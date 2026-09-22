import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  upsert: vi.fn(),
  project: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mocks.from }),
}));
vi.mock("@/services/profit-distribution.service", () => ({
  profitDistributionService: { projectInvestorProfitForCycle: mocks.project },
}));

import { copierTradeResultService } from "./copier-trade-result.service";

describe("copier trade result persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ upsert: mocks.upsert });
    mocks.upsert.mockResolvedValue({ error: null });
    mocks.project.mockResolvedValue([
      { allocationId: "allocation", investorId: "copier", projectedProfit: 37.3 },
    ]);
  });

  it("stores the authoritative personal result without touching financial tables", async () => {
    await copierTradeResultService.recordForCompletedTrade({
      id: "trade",
      investmentCycleId: "cycle",
      status: "closed",
      realizedPnl: 500,
    } as never);

    expect(mocks.project).toHaveBeenCalledWith("cycle", 500);
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(mocks.from).toHaveBeenCalledWith("copier_trade_results");
    expect(mocks.upsert).toHaveBeenCalledWith(
      [{
        trade_entry_id: "trade",
        investment_cycle_id: "cycle",
        investment_allocation_id: "allocation",
        investor_id: "copier",
        result_amount: 37.3,
      }],
      { onConflict: "trade_entry_id,investment_allocation_id", ignoreDuplicates: true }
    );
  });

  it("is retry-safe through the immutable unique trade/allocation key", async () => {
    const trade = {
      id: "trade",
      investmentCycleId: "cycle",
      status: "closed",
      realizedPnl: -100,
    } as never;
    await copierTradeResultService.recordForCompletedTrade(trade);
    await copierTradeResultService.recordForCompletedTrade(trade);

    expect(mocks.upsert).toHaveBeenCalledTimes(2);
    expect(mocks.upsert.mock.calls[0]).toEqual(mocks.upsert.mock.calls[1]);
  });
});
