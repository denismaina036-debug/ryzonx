/**
 * Remove Thureya's mistaken London Breakout join; keep Black Diamond ($200 only).
 * Usage: node scripts/correct-thureya-pool-join.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const THUREYA_ID = "363659b5-8554-468b-bc93-0a227ca1b8da";
const LONDON_FUND_ID = "4e8e5167-b668-49cb-b8c2-a132dc2226d8";
const BLACK_DIAMOND_FUND_ID = "90be3bb4-d9e0-4b7f-b558-66415a2e1c9a";
const LONDON_CYCLE_ID = "5649b4d3-8afc-4fbc-8cf5-7c2e523e8ad5";
const LONDON_ALLOCATION_ID = "425b87b6-f7fe-4b9d-af0a-b065e2756b47";
const RAISED_STATUSES = [
  "pending",
  "funding_confirmed",
  "confirmed",
  "settled",
  "locked",
  "distributed",
];

function loadEnv() {
  const path = resolve(root, ".env.local");
  let raw = readFileSync(path, "utf8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function n(v) {
  return Number(v ?? 0);
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

async function sumRaisedForCycle(db, cycleId) {
  const { data, error } = await db
    .from("investment_allocations")
    .select("amount, status")
    .eq("investment_cycle_id", cycleId);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .filter((row) => RAISED_STATUSES.includes(row.status))
    .reduce((sum, row) => sum + n(row.amount), 0);
}

async function countInvestors(db, cycleId) {
  const { data, error } = await db
    .from("investment_allocations")
    .select("investor_id")
    .eq("investment_cycle_id", cycleId)
    .in("status", RAISED_STATUSES);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((row) => row.investor_id)).size;
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const env = loadEnv();
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: portfolio } = await db
  .from("investor_portfolios")
  .select("total_invested")
  .eq("user_id", THUREYA_ID)
  .eq("fund_id", LONDON_FUND_ID)
  .maybeSingle();

const invested = n(portfolio?.total_invested);
if (invested <= 0) {
  console.log("London Breakout participation already cleared.");
  process.exit(0);
}

console.log(`Reversing London Breakout join ($${invested}) for Thureya...`);

const { error: allocError } = await db
  .from("investment_allocations")
  .update({ status: "cancelled" })
  .eq("id", LONDON_ALLOCATION_ID);
if (allocError) throw new Error(allocError.message);

const { data: position } = await db
  .from("pool_investor_positions")
  .select("id, capital")
  .eq("fund_id", LONDON_FUND_ID)
  .eq("investor_id", THUREYA_ID)
  .eq("is_virtual", false)
  .maybeSingle();

if (position) {
  const nextCapital = roundMoney(Math.max(0, n(position.capital) - invested));
  if (nextCapital === 0) {
    await db.from("pool_investor_positions").delete().eq("id", position.id);
  } else {
    await db.from("pool_investor_positions").update({ capital: nextCapital }).eq("id", position.id);
  }
}

const { data: positions } = await db
  .from("pool_investor_positions")
  .select("capital")
  .eq("fund_id", LONDON_FUND_ID)
  .eq("is_virtual", false);
const investorCapital = roundMoney((positions ?? []).reduce((sum, row) => sum + n(row.capital), 0));

const { data: fund } = await db
  .from("funds")
  .select("current_capital, active_investors")
  .eq("id", LONDON_FUND_ID)
  .maybeSingle();

await db
  .from("investor_portfolios")
  .update({
    total_invested: 0,
    current_value: 0,
    total_deposits: 0,
    unrealized_pnl: 0,
    realized_pnl: 0,
    ownership_percentage: 0,
    investment_start_date: null,
    investment_maturity_date: null,
    investment_duration_days: null,
    last_deposit_at: null,
  })
  .eq("user_id", THUREYA_ID)
  .eq("fund_id", LONDON_FUND_ID);

await db
  .from("funds")
  .update({
    current_capital: Math.max(0, n(fund?.current_capital) - invested),
    active_investors: Math.max(0, n(fund?.active_investors) - 1),
    investor_capital: investorCapital,
  })
  .eq("id", LONDON_FUND_ID);

await db
  .from("transactions")
  .update({
    status: "cancelled",
    notes:
      "Reversed — duplicate pool join from single $200 deposit; investor keeps Black Diamond only",
  })
  .eq("user_id", THUREYA_ID)
  .eq("fund_id", LONDON_FUND_ID)
  .eq("type", "adjustment")
  .eq("payment_method", "pool_allocation")
  .eq("status", "completed")
  .eq("amount", invested);

const raised = await sumRaisedForCycle(db, LONDON_CYCLE_ID);
const investorCount = await countInvestors(db, LONDON_CYCLE_ID);
await db
  .from("investment_cycles")
  .update({ raised_capital: raised, investor_count: investorCount })
  .eq("id", LONDON_CYCLE_ID);

const { data: portfolios } = await db
  .from("investor_portfolios")
  .select("fund_id, total_invested, total_deposits, available_balance")
  .eq("user_id", THUREYA_ID);

const { data: allocs } = await db
  .from("investment_allocations")
  .select("amount, status, investment_cycle_id")
  .eq("investor_id", THUREYA_ID);

console.log("\n=== AFTER CORRECTION ===");
console.log(JSON.stringify({ portfolios, allocs, londonCycleRaised: raised }, null, 2));

const blackDiamond = (portfolios ?? []).find((p) => p.fund_id === BLACK_DIAMOND_FUND_ID);
const london = (portfolios ?? []).find((p) => p.fund_id === LONDON_FUND_ID);
const activeAllocs = (allocs ?? []).filter(
  (a) => a.status !== "cancelled" && a.status !== "rejected"
);

if (n(blackDiamond?.total_invested) !== 200) {
  throw new Error(`Expected $200 in Black Diamond, got ${n(blackDiamond?.total_invested)}`);
}
if (n(london?.total_invested) > 0) {
  throw new Error("London Breakout should be zero after correction.");
}
if (activeAllocs.length !== 1) {
  throw new Error(`Expected 1 active allocation, found ${activeAllocs.length}`);
}

console.log("\nOK — Thureya now has $200 in Black Diamond only.");
