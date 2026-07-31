/**
 * Audit investment engine data alignment (read-only).
 * Usage: node scripts/reconcile-investment-engine.mjs [--apply]
 *
 * Without --apply: prints audit summary only.
 * With --apply: runs migration 058 via supabase db push (must exist locally).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const path = resolve(root, ".env.local");
  if (!existsSync(path)) {
    console.error("Missing .env.local");
    process.exit(1);
  }
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
  return typeof v === "number" ? v : Number(v ?? 0);
}

async function audit(db) {
  const issues = [];

  const { data: funds } = await db
    .from("funds")
    .select("id, name, investor_capital, is_default")
    .eq("is_default", false);

  const { data: positions } = await db.from("pool_investor_positions").select("fund_id, capital, is_virtual");

  const posByFund = new Map();
  for (const p of positions ?? []) {
    if (p.is_virtual) continue;
    posByFund.set(p.fund_id, (posByFund.get(p.fund_id) ?? 0) + n(p.capital));
  }

  for (const f of funds ?? []) {
    const posTotal = posByFund.get(f.id) ?? 0;
    const delta = Math.abs(n(f.investor_capital) - posTotal);
    if (delta > 0.01 && (posTotal > 0 || n(f.investor_capital) > 0)) {
      issues.push({
        type: "fund_vs_positions",
        fund: f.name,
        fundCapital: n(f.investor_capital),
        positionsTotal: posTotal,
        delta,
      });
    }
  }

  const { data: portfolios } = await db
    .from("investor_portfolios")
    .select("user_id, fund_id, total_invested, total_deposits, current_value, realized_pnl")
    .gt("total_invested", 0);

  const { data: posRows } = await db
    .from("pool_investor_positions")
    .select("fund_id, investor_id, capital")
    .eq("is_virtual", false);

  const posMap = new Map((posRows ?? []).map((r) => [`${r.fund_id}:${r.investor_id}`, n(r.capital)]));

  for (const ip of portfolios ?? []) {
    const key = `${ip.fund_id}:${ip.user_id}`;
    const pos = posMap.get(key) ?? 0;
    const principal = n(ip.total_deposits) || n(ip.total_invested);
    if (Math.abs(pos - principal) > 0.01 && principal > 0) {
      issues.push({
        type: "portfolio_vs_position",
        fundId: ip.fund_id,
        investorId: ip.user_id,
        portfolioInvested: n(ip.total_invested),
        deposits: n(ip.total_deposits),
        positionCapital: pos,
      });
    }
    if (n(ip.realized_pnl) > 0.01) {
      issues.push({
        type: "legacy_realized_pnl_on_portfolio",
        fundId: ip.fund_id,
        investorId: ip.user_id,
        realizedPnl: n(ip.realized_pnl),
      });
    }
  }

  const { data: cycles } = await db
    .from("investment_cycles")
    .select("id, name, status, current_cycle_profit");

  for (const c of cycles ?? []) {
    const { data: trades } = await db
      .from("trade_entries")
      .select("realized_pnl")
      .eq("investment_cycle_id", c.id)
      .eq("status", "closed");
    const journalSum = (trades ?? []).reduce((s, t) => s + n(t.realized_pnl), 0);
    if (Math.abs(n(c.current_cycle_profit) - journalSum) > 0.01) {
      issues.push({
        type: "cycle_profit_mismatch",
        cycle: c.name,
        status: c.status,
        cached: n(c.current_cycle_profit),
        journal: journalSum,
      });
    }
    if (["trading", "distribution", "completed"].includes(c.status)) {
      const { count } = await db
        .from("cycle_ownership_snapshots")
        .select("*", { count: "exact", head: true })
        .eq("investment_cycle_id", c.id);
      if (!count) {
        issues.push({ type: "missing_ownership_snapshot", cycle: c.name, status: c.status });
      }
    }
  }

  const { count: profitApplied } = await db
    .from("trade_entries")
    .select("*", { count: "exact", head: true })
    .not("profit_applied_at", "is", null);

  const { count: tpaCount } = await db
    .from("trade_profit_allocations")
    .select("*", { count: "exact", head: true });

  if ((profitApplied ?? 0) > 0 || (tpaCount ?? 0) > 0) {
    issues.push({
      type: "legacy_per_trade_allocations",
      tradesWithProfitApplied: profitApplied ?? 0,
      tradeProfitAllocationRows: tpaCount ?? 0,
    });
  }

  return issues;
}

async function summary(db) {
  const counts = {};
  for (const table of [
    "funds",
    "investor_portfolios",
    "pool_investor_positions",
    "investor_profit_wallets",
    "investment_cycles",
    "investment_allocations",
    "trade_entries",
    "trade_profit_allocations",
    "profit_settlements",
    "cycle_ownership_snapshots",
    "investment_queue",
  ]) {
    const { count } = await db.from(table).select("*", { count: "exact", head: true });
    counts[table] = count ?? 0;
  }
  return counts;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env.local");
    process.exit(1);
  }

  const db = createClient(url, key);

  console.log("=== Investment Engine Audit ===\n");
  const counts = await summary(db);
  console.log("Data summary:", JSON.stringify(counts, null, 2), "\n");
  const issues = await audit(db);

  if (issues.length === 0) {
    console.log("No alignment issues detected. Accounts follow the engine model.\n");
  } else {
    console.log(`Found ${issues.length} issue(s):\n`);
    for (const issue of issues) {
      console.log(JSON.stringify(issue, null, 2));
    }
    console.log("");
  }

  if (apply) {
    console.log("Applying migration 00058...");
    const result = spawnSync("npx", ["supabase", "db", "push", "--yes"], {
      cwd: root,
      stdio: "inherit",
      shell: true,
    });
    if (result.status !== 0) process.exit(result.status ?? 1);

    console.log("\nRe-auditing after reconciliation...\n");
    const after = await audit(db);
    if (after.length === 0) {
      console.log("Reconciliation complete — no remaining issues.\n");
    } else {
      console.log(`Remaining ${after.length} issue(s) — review manually:\n`);
      for (const issue of after) {
        console.log(JSON.stringify(issue, null, 2));
      }
      process.exit(1);
    }
  } else if (issues.length > 0) {
    console.log("Run with --apply to push migration 00058 and reconcile:\n");
    console.log("  node scripts/reconcile-investment-engine.mjs --apply\n");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
