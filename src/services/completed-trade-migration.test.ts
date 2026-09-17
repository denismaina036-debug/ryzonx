import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";

let db: PGlite;
const migration = readFileSync("supabase/migrations/00096_completed_manual_trade_records.sql", "utf8");
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE TABLE investment_cycles(id text PRIMARY KEY, status text, current_cycle_profit numeric);
    CREATE TABLE trade_journals(id text PRIMARY KEY, investment_cycle_id text, pool_manager_id text);
    CREATE TABLE profit_settlements(investment_cycle_id text);
    CREATE TABLE trade_entries(
      id text PRIMARY KEY, journal_id text, investment_cycle_id text, pool_manager_id text,
      status text, exit_price numeric, realized_pnl numeric, trade_result text,
      opened_at timestamptz, closed_at timestamptz, created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(), loss_applied_at timestamptz, profit_applied_at timestamptz
    );
    INSERT INTO investment_cycles VALUES ('c1','trading',200),('c2','trading',400),('historical','completed',500),('settled','distribution',50);
    INSERT INTO trade_journals SELECT id, id, 'manager' FROM investment_cycles;
    INSERT INTO profit_settlements VALUES ('settled');
    INSERT INTO trade_entries(id,journal_id,investment_cycle_id,pool_manager_id,status,exit_price,realized_pnl,trade_result)
    VALUES ('valid','c1','c1','manager','open',1,100,'profit'),
      ('loss','c1','c1','manager','open',1,-50,'loss'),
      ('closed','c1','c1','manager','closed',1,200,'profit'),
      ('unknown','c1','c1','manager','open',NULL,NULL,NULL),
      ('partial','c1','c1','manager','partially_closed',1,10,'profit'),
      ('conflicting','c1','c1','manager','open',1,-10,'profit'),
      ('wrong-journal','c2','c1','manager','open',1,900,'profit'),
      ('other','c2','c2','manager','closed',1,400,'profit'),
      ('historical','historical','historical','manager','open',1,500,'profit'),
      ('settled','settled','settled','manager','open',1,50,'profit');
  `);
}, 30000);
afterAll(async () => { await db?.close(); });

it("repairs only unambiguous unsettled manual results, preserves history, and is repeatable", async () => {
  const before = (await db.query<{ id: string }>("SELECT * FROM trade_entries ORDER BY id")).rows;
  await db.exec(migration);
  const after = (await db.query<{ id: string; status: string; closed_at: unknown }>("SELECT * FROM trade_entries ORDER BY id")).rows;
  for (const row of after) {
    if (["valid", "loss"].includes(row.id)) {
      expect(row.status).toBe("closed");
      expect(row.closed_at).toBeTruthy();
    } else expect(row).toEqual(before.find(item => item.id === row.id));
  }
  expect((await db.query("SELECT id, current_cycle_profit::text AS profit FROM investment_cycles ORDER BY id")).rows).toEqual([
    { id: "c1", profit: "250" }, { id: "c2", profit: "400" },
    { id: "historical", profit: "500" }, { id: "settled", profit: "50" },
  ]);
  await db.exec(migration);
  expect((await db.query("SELECT * FROM trade_entries ORDER BY id")).rows).toEqual(after);
});
