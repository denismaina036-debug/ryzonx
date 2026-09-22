import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";

const lifecycleSql = readFileSync(
  "supabase/migrations/00095_copy_session_lifecycle.sql",
  "utf8"
);
const repairSql = readFileSync(
  "supabase/migrations/00099_cycle_sequence_and_continuation_repair.sql",
  "utf8"
);

function sqlBlock(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(`SQL block not found: ${startMarker}`);
  return source.slice(start, end + endMarker.length);
}

const continueSql = sqlBlock(
  lifecycleSql,
  "CREATE OR REPLACE FUNCTION continue_copying_atomic",
  "GRANT EXECUTE ON FUNCTION continue_copying_atomic(UUID, UUID, UUID) TO service_role;"
);
const stopGuardSql = sqlBlock(
  repairSql,
  "CREATE OR REPLACE FUNCTION prevent_stopped_copy_continuation",
  "EXECUTE FUNCTION prevent_stopped_copy_continuation();"
);

const fund = "10000000-0000-4000-a000-000000000001";
const investor = "10000000-0000-4000-a000-000000000002";
const actor = "10000000-0000-4000-a000-000000000003";
const session = "10000000-0000-4000-a000-000000000004";
const cycle1 = "10000000-0000-4000-a000-000000000011";
const cycle2 = "10000000-0000-4000-a000-000000000012";
const cycle3 = "10000000-0000-4000-a000-000000000013";
const allocation1 = "10000000-0000-4000-a000-000000000021";
const settlement1 = "10000000-0000-4000-a000-000000000031";

describe("continuous copy allocation database boundary", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE ROLE service_role;
      CREATE TABLE funds (
        id UUID PRIMARY KEY, investor_capital NUMERIC(18,2) DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE investment_cycles (
        id UUID PRIMARY KEY, fund_id UUID NOT NULL REFERENCES funds(id), status TEXT NOT NULL
      );
      CREATE TABLE investment_allocations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), investment_cycle_id UUID NOT NULL,
        investor_id UUID NOT NULL, amount NUMERIC(18,2) NOT NULL,
        returned_capital_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'USD', status TEXT NOT NULL,
        reference_number TEXT, funding_confirmed_at TIMESTAMPTZ,
        investment_level_id UUID, roi_multiplier NUMERIC(18,4), projected_payout NUMERIC(18,2),
        copy_session_id UUID NOT NULL, allocated_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE cycle_investor_settlements (
        id UUID PRIMARY KEY, investment_cycle_id UUID NOT NULL, fund_id UUID NOT NULL,
        investor_id UUID NOT NULL, principal_amount NUMERIC(18,2) NOT NULL,
        profit_amount NUMERIC(18,2) NOT NULL, status TEXT NOT NULL,
        profit_resolved BOOLEAN NOT NULL DEFAULT false,
        capital_resolved BOOLEAN NOT NULL DEFAULT false,
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE investor_profit_wallets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), investor_id UUID NOT NULL,
        fund_id UUID NOT NULL, source_cycle_id UUID NOT NULL,
        balance NUMERIC(18,2) NOT NULL, updated_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE pool_investor_positions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), fund_id UUID NOT NULL,
        investor_id UUID NOT NULL, is_virtual BOOLEAN NOT NULL DEFAULT false,
        capital NUMERIC(18,2) NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE TABLE investor_portfolios (
        user_id UUID NOT NULL, fund_id UUID NOT NULL, total_invested NUMERIC(18,2) NOT NULL,
        current_value NUMERIC(18,2) NOT NULL, updated_at TIMESTAMPTZ DEFAULT now(),
        PRIMARY KEY (user_id, fund_id)
      );
      CREATE TABLE transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL, fund_id UUID,
        type TEXT, amount NUMERIC(18,2), status TEXT, payment_method TEXT, notes TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::JSONB, transaction_reference TEXT
      );
      CREATE TABLE audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), actor_id UUID, action TEXT,
        entity_type TEXT, entity_id UUID, old_values JSONB, new_values JSONB
      );
      CREATE TABLE copy_stop_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), investment_cycle_id UUID NOT NULL,
        investor_id UUID NOT NULL, copy_session_id UUID, status TEXT NOT NULL
      );
      CREATE OR REPLACE FUNCTION next_transaction_reference(prefix TEXT)
      RETURNS TEXT LANGUAGE sql AS $$ SELECT prefix || '-' || gen_random_uuid()::TEXT $$;

      INSERT INTO funds (id) VALUES ('${fund}');
      INSERT INTO investment_cycles (id, fund_id, status) VALUES
        ('${cycle1}', '${fund}', 'completed'),
        ('${cycle2}', '${fund}', 'draft'),
        ('${cycle3}', '${fund}', 'draft');
      INSERT INTO investment_allocations
        (id, investment_cycle_id, investor_id, amount, status, copy_session_id)
      VALUES ('${allocation1}', '${cycle1}', '${investor}', 100, 'distributed', '${session}');
      INSERT INTO cycle_investor_settlements
        (id, investment_cycle_id, fund_id, investor_id, principal_amount, profit_amount, status)
      VALUES ('${settlement1}', '${cycle1}', '${fund}', '${investor}', 100, 20, 'pending_choice');
      INSERT INTO investor_profit_wallets
        (investor_id, fund_id, source_cycle_id, balance)
      VALUES ('${investor}', '${fund}', '${cycle1}', 20);
      INSERT INTO pool_investor_positions (fund_id, investor_id, capital)
      VALUES ('${fund}', '${investor}', 0);
      INSERT INTO investor_portfolios (user_id, fund_id, total_invested, current_value)
      VALUES ('${investor}', '${fund}', 100, 120);
    `);
    await db.exec(continueSql);
    await db.exec(stopGuardSql);
  });

  it("keeps settled continuation pending while no next cycle is eligible", async () => {
    await expect(
      db.query("SELECT continue_copying_atomic($1::uuid, $2::uuid, $3::uuid)", [
        settlement1,
        cycle2,
        actor,
      ])
    ).rejects.toThrow("not accepting copied balances");

    const settlement = await db.query<{ status: string; capital_resolved: boolean }>(
      "SELECT status, capital_resolved FROM cycle_investor_settlements WHERE id = $1",
      [settlement1]
    );
    expect(settlement.rows[0]).toEqual({ status: "pending_choice", capital_resolved: false });
  });

  it("creates one fresh next-cycle allocation from settled principal plus profit", async () => {
    await db.query("UPDATE investment_cycles SET status = 'funding' WHERE id = $1", [cycle2]);
    await db.query("SELECT continue_copying_atomic($1::uuid, $2::uuid, $3::uuid)", [
      settlement1,
      cycle2,
      actor,
    ]);

    const allocations = await db.query<{ investment_cycle_id: string; amount: string }>(
      "SELECT investment_cycle_id, amount::text FROM investment_allocations ORDER BY allocated_at"
    );
    expect(allocations.rows).toEqual([
      { investment_cycle_id: cycle1, amount: "100.00" },
      { investment_cycle_id: cycle2, amount: "120.00" },
    ]);
  });

  it("uses the authoritative loss-adjusted settled principal without recalculating loss", async () => {
    await db.query(
      "UPDATE cycle_investor_settlements SET principal_amount = 85, profit_amount = 0 WHERE id = $1",
      [settlement1]
    );
    await db.query("UPDATE investment_cycles SET status = 'funding' WHERE id = $1", [cycle2]);
    await db.query("SELECT continue_copying_atomic($1::uuid, $2::uuid, $3::uuid)", [
      settlement1,
      cycle2,
      actor,
    ]);

    const target = await db.query<{ amount: string }>(
      "SELECT amount::text FROM investment_allocations WHERE investment_cycle_id = $1",
      [cycle2]
    );
    expect(target.rows[0]).toEqual({ amount: "85.00" });
  });

  it("is idempotent when continuation is retried", async () => {
    await db.query("UPDATE investment_cycles SET status = 'funding' WHERE id = $1", [cycle2]);
    await Promise.all([
      db.query("SELECT continue_copying_atomic($1::uuid, $2::uuid, $3::uuid)", [settlement1, cycle2, actor]),
      db.query("SELECT continue_copying_atomic($1::uuid, $2::uuid, $3::uuid)", [settlement1, cycle2, actor]),
    ]);

    const target = await db.query<{ count: number; total: string }>(
      "SELECT COUNT(*)::int AS count, SUM(amount)::text AS total FROM investment_allocations WHERE investment_cycle_id = $1",
      [cycle2]
    );
    expect(target.rows[0]).toEqual({ count: 1, total: "120.00" });
    expect((await db.query("SELECT * FROM transactions WHERE payment_method = 'copy_continue'")).rows)
      .toHaveLength(1);
  });

  it("continues the same session across more than one rollover", async () => {
    await db.query("UPDATE investment_cycles SET status = 'funding' WHERE id = $1", [cycle2]);
    await db.query("SELECT continue_copying_atomic($1::uuid, $2::uuid, $3::uuid)", [settlement1, cycle2, actor]);
    const secondAllocation = await db.query<{ id: string }>(
      "SELECT id FROM investment_allocations WHERE investment_cycle_id = $1",
      [cycle2]
    );
    const settlement2 = "10000000-0000-4000-a000-000000000032";
    await db.query("UPDATE investment_cycles SET status = 'completed' WHERE id = $1", [cycle2]);
    await db.query("UPDATE investment_cycles SET status = 'funding' WHERE id = $1", [cycle3]);
    await db.query("UPDATE investment_allocations SET status = 'distributed' WHERE id = $1", [
      secondAllocation.rows[0]!.id,
    ]);
    await db.query(
      `INSERT INTO cycle_investor_settlements
        (id, investment_cycle_id, fund_id, investor_id, principal_amount, profit_amount, status)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 120, 25, 'pending_choice')`,
      [settlement2, cycle2, fund, investor]
    );
    await db.query(
      "INSERT INTO investor_profit_wallets (investor_id, fund_id, source_cycle_id, balance) VALUES ($1::uuid, $2::uuid, $3::uuid, 25)",
      [investor, fund, cycle2]
    );
    await db.query("SELECT continue_copying_atomic($1::uuid, $2::uuid, $3::uuid)", [settlement2, cycle3, actor]);

    const target = await db.query<{ amount: string; copy_session_id: string }>(
      "SELECT amount::text, copy_session_id::text FROM investment_allocations WHERE investment_cycle_id = $1",
      [cycle3]
    );
    expect(target.rows[0]).toEqual({ amount: "145.00", copy_session_id: session });
  });

  it("rolls continuation back when a stop request exists", async () => {
    await db.query("UPDATE investment_cycles SET status = 'funding' WHERE id = $1", [cycle2]);
    await db.query(
      "INSERT INTO copy_stop_requests (investment_cycle_id, investor_id, copy_session_id, status) VALUES ($1::uuid, $2::uuid, $3::uuid, 'requested')",
      [cycle1, investor, session]
    );

    await expect(
      db.query("SELECT continue_copying_atomic($1::uuid, $2::uuid, $3::uuid)", [settlement1, cycle2, actor])
    ).rejects.toThrow("pending stop request");
    expect(
      (await db.query("SELECT * FROM investment_allocations WHERE investment_cycle_id = $1", [cycle2])).rows
    ).toHaveLength(0);
    expect(
      (await db.query("SELECT status FROM cycle_investor_settlements WHERE id = $1", [settlement1])).rows[0]
    ).toEqual({ status: "pending_choice" });
  });
});
