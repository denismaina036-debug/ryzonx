import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";

const invariantMigration = readFileSync(
  "supabase/migrations/00097_atomic_funding_cycle_invariant.sql",
  "utf8"
);
const repairMigration = readFileSync(
  "supabase/migrations/00098_repair_session_order_flow_prepared_cycles.sql",
  "utf8"
);

const fundId = "00000000-0000-4000-a000-000000000101";
const actorId = "00000000-0000-4000-a000-000000000102";
const firstId = "00000000-0000-4000-a000-000000000103";
const secondId = "00000000-0000-4000-a000-000000000104";

describe("funding cycle database invariant", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE ROLE service_role;
      CREATE TYPE investment_cycle_status AS ENUM (
        'draft', 'submitted', 'approved', 'funding', 'trading',
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
      INSERT INTO funds (id) VALUES ('${fundId}');
      INSERT INTO investment_cycles (id, fund_id, status)
      VALUES
        ('${firstId}', '${fundId}', 'draft'),
        ('${secondId}', '${fundId}', 'draft');
    `);
    await db.exec(invariantMigration);
  });

  it("opens a prepared cycle atomically and records all lifecycle timestamps", async () => {
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
    expect(result.rows[0]).toMatchObject({ status: "funding" });
    expect(result.rows[0]?.submitted_at).not.toBeNull();
    expect(result.rows[0]?.approved_at).not.toBeNull();
    expect(result.rows[0]?.funding_started_at).not.toBeNull();
  });

  it("prevents duplicate and concurrent-style activation while leaving the loser draft", async () => {
    const attempts = await Promise.allSettled([
      db.query("SELECT activate_investment_cycle_funding_atomic($1::uuid, $2::uuid)", [firstId, actorId]),
      db.query("SELECT activate_investment_cycle_funding_atomic($1::uuid, $2::uuid)", [secondId, actorId]),
    ]);

    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.status === "rejected")).toHaveLength(1);
    const result = await db.query<{ status: string; count: number }>(
      "SELECT status, COUNT(*)::int AS count FROM investment_cycles GROUP BY status"
    );
    expect(result.rows.find((row) => row.status === "funding")?.count).toBe(1);
    expect(result.rows.find((row) => row.status === "draft")?.count).toBe(1);
  });

  it("keeps the repair narrowly scoped and free of financial mutations", () => {
    expect(repairMigration).toContain("v_cycle_14_id");
    expect(repairMigration).toContain("v_cycle_15_id");
    expect(repairMigration).toContain("status = 'funding'");
    expect(repairMigration).toContain("status = 'draft'");
    expect(repairMigration).not.toMatch(
      /UPDATE\s+(investment_allocations|wallets|investor_portfolios|transactions|ledger_|trade_|profit_)/i
    );
    expect(repairMigration).not.toMatch(/DELETE\s+FROM/i);
  });

  it("applies the targeted repair only when the reviewed production state matches", async () => {
    const targetFund = "0b865d8c-2b50-432e-b9e7-0c86d588ff15";
    const strategy = "9819f9af-c6fd-4476-9507-f494511be0ce";
    const cycle14 = "da719c03-ae55-4651-92b8-8ea80473e44c";
    const cycle15 = "2ec88efc-ccbc-4008-afa9-24e5164e5761";
    await db.exec(`
      INSERT INTO funds (id) VALUES ('${targetFund}');
      INSERT INTO investment_cycles (
        id, fund_id, strategy_id, cycle_number, status, submitted_at, approved_at
      ) VALUES
        ('${cycle14}', '${targetFund}', '${strategy}', 14, 'approved', now(), now()),
        ('${cycle15}', '${targetFund}', '${strategy}', 15, 'approved', now(), now());
    `);

    await db.exec(repairMigration);

    const result = await db.query<{ cycle_number: number; status: string }>(
      "SELECT cycle_number, status FROM investment_cycles WHERE fund_id = $1 ORDER BY cycle_number",
      [targetFund]
    );
    expect(result.rows).toEqual([
      { cycle_number: 14, status: "funding" },
      { cycle_number: 15, status: "draft" },
    ]);
  });
});
