import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/00098_cycle_loss_cap_total_traded_capital.sql"),
  "utf8"
);

describe("cycle loss cap migration", () => {
  it("uses initial plus copier capital for the K-D Cycle 4 boundary", async () => {
    const db = new PGlite();
    await db.exec(`
      CREATE TABLE investment_cycles (
        id UUID PRIMARY KEY,
        raised_capital NUMERIC(18, 2) NOT NULL,
        pool_config_snapshot JSONB NOT NULL
      );
      CREATE TABLE investment_allocations (
        id UUID PRIMARY KEY,
        investment_cycle_id UUID NOT NULL,
        amount NUMERIC(18, 2) NOT NULL,
        status TEXT NOT NULL
      );
      CREATE TABLE trade_entries (
        id UUID PRIMARY KEY,
        investment_cycle_id UUID NOT NULL,
        status TEXT NOT NULL,
        realized_pnl NUMERIC(18, 2)
      );
    `);
    await db.exec(migration);
    await db.exec(`
      CREATE TRIGGER trade_entries_loss_cap_guard
        BEFORE INSERT OR UPDATE OF status, realized_pnl, investment_cycle_id
        ON trade_entries
        FOR EACH ROW
        EXECUTE FUNCTION enforce_cycle_trade_loss_cap();

      INSERT INTO investment_cycles VALUES (
        '00000000-0000-0000-0000-000000000004',
        12776.70,
        '{"pool":{"initialRaisedCapital":12300}}'
      );
      INSERT INTO investment_allocations VALUES (
        '00000000-0000-0000-0000-000000000104',
        '00000000-0000-0000-0000-000000000004',
        476.70,
        'locked'
      );
      INSERT INTO trade_entries VALUES (
        '00000000-0000-0000-0000-000000000204',
        '00000000-0000-0000-0000-000000000004',
        'closed',
        -2719
      );
    `);

    await expect(
      db.exec(`
        INSERT INTO trade_entries VALUES (
          '00000000-0000-0000-0000-000000000205',
          '00000000-0000-0000-0000-000000000004',
          'closed',
          -10057.71
        );
      `)
    ).rejects.toThrow("total capital traded in the cycle");
  });
});
