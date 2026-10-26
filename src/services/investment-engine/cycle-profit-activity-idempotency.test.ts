import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/00105_cycle_profit_activity_idempotency.sql",
  "utf8"
);

describe("cycle profit activity idempotency migration", () => {
  let db: PGlite;
  let initialized = false;

  beforeEach(async () => {
    if (initialized) {
      await db.exec(`
        TRUNCATE transactions;
        ALTER TABLE transactions DISABLE TRIGGER prevent_duplicate_cycle_profit_activity_before_insert;
        INSERT INTO transactions(user_id, payment_method, metadata) VALUES
          ('20000000-0000-4000-a000-000000000001', 'cycle_profit', '{"allocationId":"legacy"}'),
          ('20000000-0000-4000-a000-000000000001', 'cycle_profit', '{"allocationId":"legacy"}');
        ALTER TABLE transactions ENABLE TRIGGER prevent_duplicate_cycle_profit_activity_before_insert;
      `);
      return;
    }
    db = new PGlite();
    await db.exec(`
      CREATE TABLE transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        payment_method TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb
      );
      INSERT INTO transactions(user_id, payment_method, metadata) VALUES
        ('20000000-0000-4000-a000-000000000001', 'cycle_profit', '{"allocationId":"legacy"}'),
        ('20000000-0000-4000-a000-000000000001', 'cycle_profit', '{"allocationId":"legacy"}');
    `);
    await db.exec(migration);
    initialized = true;
  });

  afterAll(async () => {
    await db.close();
  });

  it("preserves existing history and skips another row for that allocation", async () => {
    await db.exec(`INSERT INTO transactions(user_id, payment_method, metadata)
      VALUES ('20000000-0000-4000-a000-000000000001', 'cycle_profit', '{"allocationId":"legacy"}')`);
    const rows = await db.query("SELECT id FROM transactions WHERE metadata->>'allocationId'='legacy'");
    expect(rows.rows).toHaveLength(2);
  });

  it("preserves the 295-row production-shaped history and adds no 296th row", async () => {
    await db.exec(`
      ALTER TABLE transactions DISABLE TRIGGER prevent_duplicate_cycle_profit_activity_before_insert;
      INSERT INTO transactions(user_id, payment_method, metadata)
      SELECT '20000000-0000-4000-a000-000000000001', 'cycle_profit',
        '{"allocationId":"production-shaped"}'::jsonb
      FROM generate_series(1, 295);
      ALTER TABLE transactions ENABLE TRIGGER prevent_duplicate_cycle_profit_activity_before_insert;
      INSERT INTO transactions(user_id, payment_method, metadata)
      VALUES ('20000000-0000-4000-a000-000000000001', 'cycle_profit', '{"allocationId":"production-shaped"}');
    `);
    const rows = await db.query(
      "SELECT id FROM transactions WHERE metadata->>'allocationId'='production-shaped'"
    );
    expect(rows.rows).toHaveLength(295);
  });

  it("allows exactly one row across concurrent attempts for a new allocation", async () => {
    await Promise.all(Array.from({ length: 16 }, () => db.exec(`
      INSERT INTO transactions(user_id, payment_method, metadata)
      VALUES ('20000000-0000-4000-a000-000000000001', 'cycle_profit', '{"allocationId":"concurrent"}')
    `)));
    const rows = await db.query(
      "SELECT id FROM transactions WHERE metadata->>'allocationId'='concurrent'"
    );
    expect(rows.rows).toHaveLength(1);
  });

  it("allows one new activity row and silently skips later duplicates", async () => {
    await db.exec(`INSERT INTO transactions(user_id, payment_method, metadata)
      VALUES ('20000000-0000-4000-a000-000000000001', 'cycle_profit', '{"allocationId":"new"}')`);
    await db.exec(`INSERT INTO transactions(user_id, payment_method, metadata)
      VALUES ('20000000-0000-4000-a000-000000000001', 'cycle_profit', '{"allocationId":"new"}')`);
    const rows = await db.query("SELECT id FROM transactions WHERE metadata->>'allocationId'='new'");
    expect(rows.rows).toHaveLength(1);
  });

  it("rejects an untraceable cycle profit activity", async () => {
    await expect(db.exec(`INSERT INTO transactions(user_id, payment_method, metadata)
      VALUES ('20000000-0000-4000-a000-000000000001', 'cycle_profit', '{}')`))
      .rejects.toThrow("requires metadata.allocationId");
  });

  it("does not interfere with authoritative or unrelated transaction methods", async () => {
    await db.exec(`INSERT INTO transactions(user_id, payment_method, metadata) VALUES
      ('20000000-0000-4000-a000-000000000001', 'pool_allocation', '{}'),
      ('20000000-0000-4000-a000-000000000001', 'profit_transfer', '{}')`);
    const rows = await db.query("SELECT id FROM transactions WHERE payment_method <> 'cycle_profit'");
    expect(rows.rows).toHaveLength(2);
  });
});
