import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/00088_stop_copying_atomic.sql"),
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
});
