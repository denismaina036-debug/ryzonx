import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";

const invariantMigration = readFileSync(
  "supabase/migrations/00097_atomic_funding_cycle_invariant.sql",
  "utf8"
);
const sequenceRepairMigration = readFileSync(
  "supabase/migrations/00101_prepared_cycle_funding_functions.sql",
  "utf8"
);
const stopGuardMigration = readFileSync(
  "supabase/migrations/00099_cycle_sequence_and_continuation_repair.sql",
  "utf8"
);

const fundId = "00000000-0000-4000-a000-000000000101";
const actorId = "00000000-0000-4000-a000-000000000102";
const firstId = "00000000-0000-4000-a000-000000000103";
const secondId = "00000000-0000-4000-a000-000000000104";
const thirdId = "00000000-0000-4000-a000-000000000105";

describe("funding cycle database invariant", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE ROLE service_role;
      CREATE TYPE investment_cycle_status AS ENUM (
        'draft', 'submitted', 'approved', 'prepared', 'funding', 'trading',
        'distribution', 'completed', 'archived'
      );
      CREATE TABLE funds (id UUID PRIMARY KEY);
      CREATE TABLE investment_cycles (
        id UUID PRIMARY KEY,
        fund_id UUID REFERENCES funds(id),
        strategy_id UUID,
        cycle_number INTEGER,
        status investment_cycle_status NOT NULL,
        submitted_at TIMESTAMPTZ,
        approved_at TIMESTAMPTZ,
        funding_started_at TIMESTAMPTZ,
        trading_started_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_id UUID,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id UUID,
        old_values JSONB,
        new_values JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE investment_allocations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        investment_cycle_id UUID NOT NULL REFERENCES investment_cycles(id)
      );
      CREATE TABLE copy_stop_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        investment_cycle_id UUID NOT NULL,
        investor_id UUID NOT NULL,
        copy_session_id UUID,
        status TEXT NOT NULL
      );
      CREATE TABLE transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        payment_method TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::JSONB
      );
      INSERT INTO funds (id) VALUES ('${fundId}');
      INSERT INTO investment_cycles (id, fund_id, cycle_number, status)
      VALUES
        ('${firstId}', '${fundId}', 1, 'prepared'),
        ('${secondId}', '${fundId}', 2, 'prepared');
    `);
    await db.exec(invariantMigration);
    await db.exec(sequenceRepairMigration);
    const guardStart = stopGuardMigration.indexOf("CREATE OR REPLACE FUNCTION prevent_stopped_copy_continuation");
    await db.exec(stopGuardMigration.slice(guardStart));
  });

  it("opens the first prepared cycle without recording per-cycle admin approval", async () => {
    await db.query(
      "SELECT activate_investment_cycle_funding_atomic($1::uuid, $2::uuid)",
      [firstId, actorId]
    );

    const result = await db.query<{
      status: string;
      submitted_at: string | null;
      approved_at: string | null;
      funding_started_at: string | null;
    }>(
      "SELECT status, submitted_at, approved_at, funding_started_at FROM investment_cycles WHERE id = $1",
      [firstId]
    );
    expect(result.rows[0]).toMatchObject({ status: "funding", approved_at: null });
    expect(result.rows[0]?.submitted_at).not.toBeNull();
    expect(result.rows[0]?.funding_started_at).not.toBeNull();
  });

  it("keeps the successor prepared until its predecessor starts trading", async () => {
    await db.query(
      "SELECT activate_investment_cycle_funding_atomic($1::uuid, $2::uuid)",
      [firstId, actorId]
    );
    await expect(
      db.query("SELECT activate_investment_cycle_funding_atomic($1::uuid, $2::uuid)", [
        secondId,
        actorId,
      ])
    ).rejects.toThrow();

    const result = await db.query<{ status: string }>(
      "SELECT status FROM investment_cycles WHERE id = $1",
      [secondId]
    );
    expect(result.rows[0]?.status).toBe("prepared");
  });

  it("starts one cycle and opens only its direct successor in the same transaction", async () => {
    await db.query(
      "SELECT activate_investment_cycle_funding_atomic($1::uuid, $2::uuid)",
      [firstId, actorId]
    );
    await db.query("SELECT start_investment_cycle_trading_atomic($1::uuid, $2::uuid)", [
      firstId,
      actorId,
    ]);

    const result = await db.query<{ cycle_number: number; status: string }>(
      "SELECT cycle_number, status FROM investment_cycles ORDER BY cycle_number"
    );
    expect(result.rows).toEqual([
      { cycle_number: 1, status: "trading" },
      { cycle_number: 2, status: "funding" },
    ]);
  });

  it("supports multiple trading cycles and advances funding sequentially", async () => {
    await db.exec(`
      INSERT INTO investment_cycles (id, fund_id, cycle_number, status)
      VALUES ('${thirdId}', '${fundId}', 3, 'prepared')
    `);
    await db.query("SELECT activate_investment_cycle_funding_atomic($1::uuid, $2::uuid)", [
      firstId,
      actorId,
    ]);
    await db.query("SELECT start_investment_cycle_trading_atomic($1::uuid, $2::uuid)", [
      firstId,
      actorId,
    ]);
    await db.query("SELECT start_investment_cycle_trading_atomic($1::uuid, $2::uuid)", [
      secondId,
      actorId,
    ]);

    const result = await db.query<{ cycle_number: number; status: string }>(
      "SELECT cycle_number, status FROM investment_cycles ORDER BY cycle_number"
    );
    expect(result.rows).toEqual([
      { cycle_number: 1, status: "trading" },
      { cycle_number: 2, status: "trading" },
      { cycle_number: 3, status: "funding" },
    ]);
  });

  it("keeps the migration free of financial data changes", () => {
    expect(sequenceRepairMigration).toContain("activate_next_investment_cycle_funding_atomic");
    expect(sequenceRepairMigration).toContain("start_investment_cycle_trading_atomic");
    expect(sequenceRepairMigration).not.toMatch(
      /UPDATE\s+(investment_allocations|wallets|investor_portfolios|transactions|ledger_|trade_|profit_)/i
    );
    expect(sequenceRepairMigration).not.toMatch(/DELETE\s+FROM/i);
  });

  it("blocks continuation records when the same copy session has requested a stop", async () => {
    const investorId = "00000000-0000-4000-a000-000000000106";
    const sessionId = "00000000-0000-4000-a000-000000000107";
    await db.query(
      `INSERT INTO copy_stop_requests
        (investment_cycle_id, investor_id, copy_session_id, status)
       VALUES ($1::uuid, $2::uuid, $3::uuid, 'requested')`,
      [firstId, investorId, sessionId]
    );

    await expect(
      db.query(
        `INSERT INTO transactions (user_id, payment_method, metadata)
         VALUES ($1::uuid, 'copy_continue', $2::jsonb)`,
        [
          investorId,
          JSON.stringify({ source_cycle_id: firstId, copy_session_id: sessionId }),
        ]
      )
    ).rejects.toThrow("pending stop request");
  });
});
