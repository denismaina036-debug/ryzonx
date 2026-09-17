import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ process: vi.fn(), sync: vi.fn() }));
vi.mock("@/services/investment-cycle.service", () => ({ investmentCycleService: { getById: async () => ({ fundId: "fund" }) } }));
vi.mock("./cycle-ownership.service", () => ({ cycleOwnershipService: {} }));
vi.mock("./cycle-profit.service", () => ({ cycleProfitService: {} }));
vi.mock("./pool-capital.service", () => ({ poolCapitalService: { syncFundInvestorCapital: mocks.sync } }));
vi.mock("./investment-queue.service", () => ({ investmentQueueService: {
  listPending: async () => [{ id: "q1", targetCycleId: "c1" }, { id: "q2", targetCycleId: "c2" }, { id: "q3", targetCycleId: null }],
  processItem: mocks.process,
} }));
import { cycleLifecycleOrchestrator } from "./cycle-lifecycle-orchestrator.service";
it("does not process sibling-cycle or unassigned queued capital during distribution", async () => {
  await cycleLifecycleOrchestrator.onSettlementDistributed("c1", "actor");
  expect(mocks.process).toHaveBeenCalledExactlyOnceWith({ id: "q1", targetCycleId: "c1" });
});
