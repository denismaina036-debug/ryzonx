import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it } from "vitest";

let db: PGlite;
const investor = randomUUID(), fund = randomUUID(), cycle1 = randomUUID(), cycle2 = randomUUID();
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE service_role;
    CREATE TYPE ledger_transaction_type AS ENUM ('profit_distribution');
    CREATE TYPE ledger_entry_side AS ENUM ('debit', 'credit');
    CREATE TABLE profiles(id uuid PRIMARY KEY);
    CREATE TABLE funds(id uuid PRIMARY KEY);
    CREATE TABLE investment_cycles(id uuid PRIMARY KEY);
    CREATE TABLE cycle_investor_settlements(id uuid PRIMARY KEY);
    CREATE TABLE investment_queue(id uuid PRIMARY KEY, queue_type text);
    CREATE TABLE investor_profit_wallets(investor_id uuid, fund_id uuid, source_cycle_id uuid, balance numeric(18,2), updated_at timestamptz DEFAULT now());
    CREATE UNIQUE INDEX wallet_cycle ON investor_profit_wallets(investor_id,fund_id,(COALESCE(source_cycle_id,'00000000-0000-0000-0000-000000000000'::uuid)));
    CREATE TABLE ledger_transactions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reference text, description text, transaction_type ledger_transaction_type, status text, source_type text, source_id uuid, actor_id uuid, metadata jsonb);
    CREATE TABLE ledger_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), transaction_id uuid REFERENCES ledger_transactions(id), account_id uuid, entry_side ledger_entry_side, amount numeric(18,2), currency text, memo text, created_at timestamptz DEFAULT now());
  `);
  // Execute the existing production wallet and ledger functions, unchanged.
  const sql = readFileSync("supabase/migrations/00077_financial_event_atomicity.sql", "utf8");
  await db.exec(sql.slice(0, sql.indexOf("CREATE OR REPLACE FUNCTION reserve_withdrawal_atomic")));
  await db.query("INSERT INTO profiles VALUES ($1)", [investor]);
  await db.query("INSERT INTO funds VALUES ($1)", [fund]);
  await db.query("INSERT INTO investment_cycles VALUES ($1),($2)", [cycle1, cycle2]);
}, 30000);
afterAll(async () => { await db?.close(); });

it("retries wallet and ledger posting without duplicate credits or touching another cycle", async () => {
  await db.query("SELECT credit_investor_profit_wallet_once($1,$2,$3,400,'cycle2')", [investor, fund, cycle2]);
  const payable = randomUUID(), profit = randomUUID(), allocation = randomUUID();
  const entries = JSON.stringify([{ accountId: payable, entrySide: "debit", amount: 1000 }, { accountId: profit, entrySide: "credit", amount: 1000 }]);
  for (let retry = 0; retry < 3; retry++) {
    await db.query("SELECT credit_investor_profit_wallet_once($1,$2,$3,1000,$4)", [investor, fund, cycle1, `profit-allocation:${allocation}:wallet-credit`]);
    await db.query("SELECT post_ledger_transaction_atomic($1,'Cycle payout','profit_distribution','profit_settlement_allocation',$2,$3,$4::jsonb,$5,$6::jsonb)", [randomUUID(), allocation, investor, JSON.stringify({ cycleId: cycle1 }), `profit-allocation:${allocation}:ledger-credit`, entries]);
  }
  const wallets = (await db.query<{ source_cycle_id: string; balance: string }>("SELECT source_cycle_id,balance::text FROM investor_profit_wallets")).rows;
  expect(wallets.find(row => row.source_cycle_id === cycle1)?.balance).toBe("1000.00");
  expect(wallets.find(row => row.source_cycle_id === cycle2)?.balance).toBe("400.00");
  expect((await db.query("SELECT * FROM ledger_transactions")).rows).toHaveLength(1);
  expect((await db.query("SELECT * FROM ledger_entries")).rows).toHaveLength(2);
});
