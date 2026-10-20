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
const singleConsumptionSql = readFileSync(
  "supabase/migrations/00103_copy_continuation_single_consumption.sql",
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
const cycle4 = "10000000-0000-4000-a000-000000000014";
const cycle5 = "10000000-0000-4000-a000-000000000015";
const cycle6 = "10000000-0000-4000-a000-000000000016";
const allocation1 = "10000000-0000-4000-a000-000000000021";
const settlement1 = "10000000-0000-4000-a000-000000000031";

describe("continuous copy allocation database boundary", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE ROLE service_role;
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE TYPE ledger_transaction_type AS ENUM ('transfer');
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
        metadata JSONB NOT NULL DEFAULT '{}'::JSONB, transaction_reference TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), actor_id UUID, action TEXT,
        entity_type TEXT, entity_id UUID, old_values JSONB, new_values JSONB
      );
      CREATE TABLE copy_stop_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), investment_cycle_id UUID NOT NULL,
        investor_id UUID NOT NULL, copy_session_id UUID, status TEXT NOT NULL
      );
      CREATE TABLE ledger_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code TEXT UNIQUE NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true
      );
      CREATE TABLE ledger_postings (
        idempotency_key TEXT PRIMARY KEY, entries JSONB NOT NULL
      );
      CREATE TABLE ledger_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), status TEXT NOT NULL
      );
      CREATE TABLE ledger_entries (
        transaction_id UUID NOT NULL REFERENCES ledger_transactions(id),
        account_id UUID NOT NULL REFERENCES ledger_accounts(id),
        entry_side TEXT NOT NULL, amount NUMERIC(18,2) NOT NULL
      );
      CREATE OR REPLACE FUNCTION post_ledger_transaction_atomic(
        p_reference TEXT, p_description TEXT, p_transaction_type ledger_transaction_type,
        p_source_type TEXT, p_source_id UUID, p_actor_id UUID, p_metadata JSONB,
        p_idempotency_key TEXT, p_entries JSONB
      ) RETURNS JSONB LANGUAGE plpgsql AS $$
      BEGIN
        INSERT INTO ledger_postings (idempotency_key, entries)
        VALUES (p_idempotency_key, p_entries)
        ON CONFLICT (idempotency_key) DO NOTHING;
        RETURN jsonb_build_object('created', true);
      END;
      $$;
      CREATE OR REPLACE FUNCTION next_transaction_reference(prefix TEXT)
      RETURNS TEXT LANGUAGE sql AS $$ SELECT prefix || '-' || gen_random_uuid()::TEXT $$;

      INSERT INTO funds (id) VALUES ('${fund}');
      INSERT INTO investment_cycles (id, fund_id, status) VALUES
        ('${cycle1}', '${fund}', 'completed'),
        ('${cycle2}', '${fund}', 'draft'),
        ('${cycle3}', '${fund}', 'draft'),
        ('${cycle4}', '${fund}', 'draft'),
        ('${cycle5}', '${fund}', 'draft'),
        ('${cycle6}', '${fund}', 'draft');
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
      INSERT INTO ledger_accounts (code) VALUES
        ('CYCLE_100000000000_ESCROW'),
        ('INVESTOR_100000000000_RESERVED'),
        ('INVESTOR_10000000_POOL_10000000_PROFIT');
      WITH posting AS (
        INSERT INTO ledger_transactions (status) VALUES ('posted') RETURNING id
      )
      INSERT INTO ledger_entries (transaction_id, account_id, entry_side, amount)
      SELECT posting.id, account.id, 'credit', 100000
      FROM posting
      CROSS JOIN ledger_accounts account
      WHERE account.code IN ('CYCLE_100000000000_ESCROW', 'INVESTOR_10000000_POOL_10000000_PROFIT');
    `);
    await db.exec(continueSql);
    await db.exec(singleConsumptionSql);
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
    const posting = await db.query<{ entries: Array<{ amount: number; entrySide: string }> }>(
      "SELECT entries FROM ledger_postings"
    );
    expect(posting.rows[0]!.entries).toHaveLength(3);
    const debits = posting.rows[0]!.entries
      .filter((entry) => entry.entrySide === "debit")
      .reduce((sum, entry) => sum + Number(entry.amount), 0);
    const credits = posting.rows[0]!.entries
      .filter((entry) => entry.entrySide === "credit")
      .reduce((sum, entry) => sum + Number(entry.amount), 0);
    expect(debits).toBe(120);
    expect(credits).toBe(120);
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

  it("preserves one capital lineage across five consecutive periods", async () => {
    const targets = [cycle2, cycle3, cycle4, cycle5, cycle6];
    const profits = [20, 10, 0, 15, 5];
    const principals = [100, 120, 125, 125, 140];
    const expected = [120, 130, 125, 140, 145];
    let sourceCycle = cycle1;
    let sourceSettlement = settlement1;

    for (let index = 0; index < targets.length; index++) {
      const targetCycle = targets[index]!;
      await db.query("UPDATE investment_cycles SET status = 'completed' WHERE id = $1", [sourceCycle]);
      await db.query("UPDATE investment_cycles SET status = 'funding' WHERE id = $1", [targetCycle]);
      await db.query(
        "UPDATE pool_investor_positions SET capital = 0 WHERE fund_id = $1 AND investor_id = $2",
        [fund, investor]
      );

      if (index > 0) {
        sourceSettlement = `10000000-0000-4000-a000-${String(40 + index).padStart(12, "0")}`;
        await db.query(
          `INSERT INTO cycle_investor_settlements
            (id, investment_cycle_id, fund_id, investor_id, principal_amount, profit_amount, status)
           VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6, 'pending_choice')`,
          [sourceSettlement, sourceCycle, fund, investor, principals[index], profits[index]]
        );
        if (profits[index]! > 0) {
          await db.query(
            "INSERT INTO investor_profit_wallets (investor_id, fund_id, source_cycle_id, balance) VALUES ($1::uuid, $2::uuid, $3::uuid, $4)",
            [investor, fund, sourceCycle, profits[index]]
          );
        }
      }

      await db.query("SELECT continue_copying_atomic($1::uuid, $2::uuid, $3::uuid)", [
        sourceSettlement,
        targetCycle,
        actor,
      ]);
      const target = await db.query<{ amount: string; copy_session_id: string }>(
        "SELECT amount::text, copy_session_id::text FROM investment_allocations WHERE investment_cycle_id = $1",
        [targetCycle]
      );
      expect(target.rows[0]).toEqual({
        amount: expected[index]!.toFixed(2),
        copy_session_id: session,
      });
      await db.query("UPDATE investment_allocations SET status = 'distributed' WHERE investment_cycle_id = $1", [targetCycle]);
      sourceCycle = targetCycle;
    }

    expect(
      (await db.query("SELECT * FROM transactions WHERE payment_method = 'copy_continue'")).rows
    ).toHaveLength(5);
    expect((await db.query("SELECT * FROM copy_continuation_claims")).rows).toHaveLength(5);
    expect((await db.query("SELECT * FROM ledger_postings")).rows).toHaveLength(5);
  });

  it("rolls every state change back when ledger classification cannot post", async () => {
    await db.query("DELETE FROM ledger_accounts WHERE code LIKE '%_RESERVED'");
    await db.query("UPDATE investment_cycles SET status = 'funding' WHERE id = $1", [cycle2]);

    await expect(
      db.query("SELECT continue_copying_atomic($1::uuid, $2::uuid, $3::uuid)", [
        settlement1,
        cycle2,
        actor,
      ])
    ).rejects.toThrow("reserved ledger account is missing");

    expect(
      (await db.query("SELECT * FROM investment_allocations WHERE investment_cycle_id = $1", [cycle2])).rows
    ).toHaveLength(0);
    expect(
      (await db.query("SELECT status, capital_resolved FROM cycle_investor_settlements WHERE id = $1", [settlement1])).rows[0]
    ).toEqual({ status: "pending_choice", capital_resolved: false });
    expect((await db.query("SELECT * FROM copy_continuation_claims")).rows).toHaveLength(0);
  });

  it("keeps concurrent copying for two traders financially independent", async () => {
    const fund2 = "20000000-0000-4000-a000-000000000001";
    const source2 = "20000000-0000-4000-a000-000000000011";
    const target2 = "20000000-0000-4000-a000-000000000012";
    const allocation2 = "20000000-0000-4000-a000-000000000021";
    const settlement2 = "20000000-0000-4000-a000-000000000031";
    const session2 = "20000000-0000-4000-a000-000000000004";
    await db.query("UPDATE investment_cycles SET status = 'funding' WHERE id = $1", [cycle2]);
    await db.exec(`
      INSERT INTO funds (id) VALUES ('${fund2}');
      INSERT INTO investment_cycles (id, fund_id, status) VALUES
        ('${source2}', '${fund2}', 'completed'),
        ('${target2}', '${fund2}', 'funding');
      INSERT INTO investment_allocations
        (id, investment_cycle_id, investor_id, amount, status, copy_session_id)
      VALUES ('${allocation2}', '${source2}', '${investor}', 75, 'distributed', '${session2}');
      INSERT INTO cycle_investor_settlements
        (id, investment_cycle_id, fund_id, investor_id, principal_amount, profit_amount, status)
      VALUES ('${settlement2}', '${source2}', '${fund2}', '${investor}', 75, 5, 'pending_choice');
      INSERT INTO investor_profit_wallets (investor_id, fund_id, source_cycle_id, balance)
      VALUES ('${investor}', '${fund2}', '${source2}', 5);
      INSERT INTO pool_investor_positions (fund_id, investor_id, capital)
      VALUES ('${fund2}', '${investor}', 0);
      INSERT INTO investor_portfolios (user_id, fund_id, total_invested, current_value)
      VALUES ('${investor}', '${fund2}', 75, 80);
      INSERT INTO ledger_accounts (code) VALUES
        ('CYCLE_200000000000_ESCROW'),
        ('INVESTOR_10000000_POOL_20000000_PROFIT');
      WITH posting AS (
        INSERT INTO ledger_transactions (status) VALUES ('posted') RETURNING id
      )
      INSERT INTO ledger_entries (transaction_id, account_id, entry_side, amount)
      SELECT posting.id, account.id, 'credit', 100000
      FROM posting
      CROSS JOIN ledger_accounts account
      WHERE account.code IN ('CYCLE_200000000000_ESCROW', 'INVESTOR_10000000_POOL_20000000_PROFIT');
    `);

    await Promise.all([
      db.query("SELECT continue_copying_atomic($1::uuid, $2::uuid, $3::uuid)", [settlement1, cycle2, actor]),
      db.query("SELECT continue_copying_atomic($1::uuid, $2::uuid, $3::uuid)", [settlement2, target2, actor]),
    ]);

    const results = await db.query<{ fund_id: string; amount: string }>(
      `SELECT cycle.fund_id::text, allocation.amount::text
       FROM investment_allocations allocation
       JOIN investment_cycles cycle ON cycle.id = allocation.investment_cycle_id
       WHERE allocation.investment_cycle_id IN ($1::uuid, $2::uuid)
       ORDER BY cycle.fund_id`,
      [cycle2, target2]
    );
    expect(results.rows).toEqual([
      { fund_id: fund, amount: "120.00" },
      { fund_id: fund2, amount: "80.00" },
    ]);
    expect((await db.query("SELECT * FROM ledger_postings")).rows).toHaveLength(2);
  });

  it("never consumes one source settlement into a second target period", async () => {
    await db.query("UPDATE investment_cycles SET status = 'funding' WHERE id = $1", [cycle2]);
    await db.query("SELECT continue_copying_atomic($1::uuid, $2::uuid, $3::uuid)", [
      settlement1,
      cycle2,
      actor,
    ]);

    // Reproduce the former backfill failure that reopened a resolved settlement.
    await db.query(
      "UPDATE cycle_investor_settlements SET status = 'pending_choice', capital_resolved = false, profit_resolved = false WHERE id = $1",
      [settlement1]
    );
    await db.query("UPDATE investment_cycles SET status = 'funding' WHERE id = $1", [cycle3]);
    await db.query(
      "UPDATE investor_profit_wallets SET balance = 20 WHERE investor_id = $1 AND source_cycle_id = $2",
      [investor, cycle1]
    );

    await expect(
      db.query("SELECT continue_copying_atomic($1::uuid, $2::uuid, $3::uuid)", [
        settlement1,
        cycle3,
        actor,
      ])
    ).rejects.toThrow("already continued to another period");

    expect(
      (await db.query("SELECT * FROM investment_allocations WHERE investment_cycle_id = $1", [cycle3])).rows
    ).toHaveLength(0);
    expect(
      (await db.query("SELECT * FROM copy_continuation_claims WHERE settlement_id = $1", [settlement1])).rows
    ).toHaveLength(1);
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

  it("seeds one immutable claim from legacy duplicate continuations", async () => {
    await db.exec(`
      DROP TRIGGER transactions_claim_copy_continuation ON transactions;
      DROP FUNCTION claim_copy_continuation_after_insert();
      DROP TABLE copy_continuation_claims;
    `);
    await db.query(
      `INSERT INTO transactions
        (id, user_id, fund_id, type, amount, status, payment_method, metadata, transaction_reference, created_at)
       VALUES
        (gen_random_uuid(), $1::uuid, $2::uuid, 'adjustment', 120, 'completed', 'copy_continue',
         jsonb_build_object('settlement_id', $3::uuid, 'source_cycle_id', $4::uuid, 'target_cycle_id', $5::uuid, 'copy_session_id', $6::uuid, 'capital_amount', 100, 'profit_amount', 20), 'LEGACY-1', now() - interval '1 day'),
        (gen_random_uuid(), $1::uuid, $2::uuid, 'adjustment', 120, 'completed', 'copy_continue',
         jsonb_build_object('settlement_id', $3::uuid, 'source_cycle_id', $4::uuid, 'target_cycle_id', $7::uuid, 'copy_session_id', $6::uuid, 'capital_amount', 100, 'profit_amount', 20), 'LEGACY-2', now())`,
      [investor, fund, settlement1, cycle1, cycle2, session, cycle3]
    );

    await db.exec(singleConsumptionSql);

    const claims = await db.query<{ target_cycle_id: string }>(
      "SELECT target_cycle_id::text FROM copy_continuation_claims WHERE settlement_id = $1",
      [settlement1]
    );
    expect(claims.rows).toEqual([{ target_cycle_id: cycle2 }]);
  });
});
