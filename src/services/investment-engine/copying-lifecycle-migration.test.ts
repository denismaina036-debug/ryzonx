import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/00088_stop_copying_atomic.sql"),
  "utf8"
);
const deferredStopSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/00089_deferred_copy_stop_requests.sql"),
  "utf8"
);
const openFundingStopSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/00091_stop_copying_open_funding.sql"),
  "utf8"
);
const lifecycleService = readFileSync(
  resolve(process.cwd(), "src/services/investment-engine/cycle-investor-settlement.service.ts"),
  "utf8"
);
const cycleService = readFileSync(
  resolve(process.cwd(), "src/services/investment-cycle.service.ts"),
  "utf8"
);

describe("copying lifecycle database boundary", () => {
  it("keeps both financial functions restricted to the service role", () => {
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION continue_copying_atomic(UUID, UUID, UUID) FROM PUBLIC"
    );
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION continue_copying_atomic(UUID, UUID, UUID) TO service_role"
    );
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION stop_copying_atomic(UUID, UUID, UUID, UUID, UUID, TEXT)"
    );
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION stop_copying_atomic(UUID, UUID, UUID, UUID, UUID, TEXT)"
    );
    expect(sql).not.toMatch(/GRANT EXECUTE[^;]+TO\s+(anon|authenticated)/i);
  });

  it("scopes stop copying to its owner and posts one balanced ledger transfer", () => {
    expect(sql).toContain("AND investor_id = p_investor_id");
    expect(sql).toContain("'accountId', p_available_account_id");
    expect(sql).toContain("'entrySide', 'credit'");
    expect(sql).toContain("'copy-stop:' || v_settlement.id::TEXT");
    expect(sql).toContain("idx_transactions_copy_stop_settlement");
  });

  it("continues only completed balances into an eligible period", () => {
    expect(sql).toContain("v_source_cycle.status NOT IN ('completed', 'archived')");
    expect(sql).toContain("v_cycle.status NOT IN ('approved', 'funding')");
    expect(sql).toContain("idx_transactions_copy_continue_target");
  });

  it("isolates an active-cycle stop request and settles it when that cycle closes", () => {
    expect(deferredStopSql).toContain("allocation_id UUID NOT NULL UNIQUE");
    expect(deferredStopSql).toContain("investment_cycle_id UUID NOT NULL");
    expect(deferredStopSql).toContain("investor_id UUID NOT NULL");
    expect(deferredStopSql).toContain("status TEXT NOT NULL DEFAULT 'requested'");
  });

  it("keeps deferred-stop mutations server-only", () => {
    expect(deferredStopSql).toContain("ALTER TABLE copy_stop_requests ENABLE ROW LEVEL SECURITY");
    expect(deferredStopSql).toContain("FOR SELECT USING (auth.uid() = investor_id)");
    expect(deferredStopSql).not.toMatch(/CREATE POLICY[^;]+FOR\s+(INSERT|UPDATE|DELETE)/i);
    expect(deferredStopSql).toContain("allocation.investor_id = NEW.investor_id");
    expect(deferredStopSql).toContain("owner_id = NEW.investor_id");
    expect(deferredStopSql).toContain("REVOKE ALL ON FUNCTION validate_copy_stop_request() FROM PUBLIC");
  });

  it("releases an automatically continued balance before trading through a service-only function", () => {
    expect(openFundingStopSql).toContain("SECURITY DEFINER");
    expect(openFundingStopSql).toContain("v_cycle.status NOT IN ('approved', 'funding')");
    expect(openFundingStopSql).toContain("REVOKE ALL ON FUNCTION stop_copying_open_funding_atomic");
    expect(openFundingStopSql).toContain("GRANT EXECUTE ON FUNCTION stop_copying_open_funding_atomic");
    expect(openFundingStopSql).not.toMatch(/GRANT EXECUTE[^;]+TO\s+(anon|authenticated)/i);
  });

  it("settles requested exits after close preparation and excludes them from rollover", () => {
    const closeStart = cycleService.indexOf("async closeCycle(");
    const transition = cycleService.indexOf('this.transition(id, "completed"', closeStart);
    const prepare = cycleService.indexOf("createPendingChoicesForCycle", transition);
    const settle = cycleService.indexOf("settleRequestedCopyStopsForCycle", prepare);
    const continueIntoNext = cycleService.indexOf("continuePendingCopyingIntoNextFundingCycle", settle);

    expect(closeStart).toBeGreaterThanOrEqual(0);
    expect(transition).toBeGreaterThan(closeStart);
    expect(prepare).toBeGreaterThan(transition);
    expect(settle).toBeGreaterThan(prepare);
    expect(continueIntoNext).toBeGreaterThan(settle);
    expect(lifecycleService).toContain(
      "requestedStops.has(`${candidate.investment_cycle_id}:${candidate.investor_id}`)"
    );
  });

  it("continues eligible copiers when an already-open next funding period becomes available", () => {
    expect(lifecycleService).toContain("continuePendingCopyingIntoNextFundingCycle");
    expect(lifecycleService).toContain('.in("status", ["approved", "funding"])');
  });

  it("includes every funded allocation state when preparing automatic continuation", () => {
    expect(lifecycleService).toContain(
      '["funding_confirmed", "confirmed", "locked", "settled", "distributed"]'
    );
  });
});
