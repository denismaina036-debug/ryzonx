/**
 * Read-only diagnostic for pool funding / investor capital mismatches.
 * Usage: node scripts/diagnose-funding-issues.mjs [pool-name-substring] [investor-name-substring]
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

const RAISED_STATUSES = [
  "pending",
  "funding_confirmed",
  "confirmed",
  "settled",
  "locked",
  "distributed",
];

function n(v) {
  return typeof v === "number" ? v : Number(v ?? 0);
}

function readInitialRaised(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return 0;
  const pool = snapshot.pool;
  const value = pool?.initialRaisedCapital;
  return Number.isFinite(value) && value > 0 ? value : 0;
}

const poolQuery = process.argv[2] ?? "black diamond";
const investorQuery = process.argv[3] ?? "thureya";

// Allow diagnostics on Windows dev machines with incomplete CA bundles.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const env = loadEnv();
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: funds, error: fundError } = await db
  .from("funds")
  .select(
    "id, name, target_capital, current_capital, display_raised_capital, investor_capital, min_investment"
  )
  .ilike("name", `%${poolQuery}%`);

if (fundError) {
  console.error(fundError.message);
  process.exit(1);
}

console.log("\n=== MATCHING FUNDS ===");
console.log(JSON.stringify(funds, null, 2));

for (const fund of funds ?? []) {
  const { data: cycles } = await db
    .from("investment_cycles")
    .select(
      "id, name, slug, cycle_number, status, raised_capital, target_capital, investor_count, pool_config_snapshot"
    )
    .eq("fund_id", fund.id)
    .order("cycle_number");

  console.log(`\n=== CYCLES: ${fund.name} ===`);
  for (const cycle of cycles ?? []) {
    const initialRaised = readInitialRaised(cycle.pool_config_snapshot);
    const { data: allocs } = await db
      .from("investment_allocations")
      .select("amount, status")
      .eq("investment_cycle_id", cycle.id);

    const allocationSum = (allocs ?? [])
      .filter((a) => RAISED_STATUSES.includes(a.status))
      .reduce((sum, a) => sum + n(a.amount), 0);
    const expectedRaised = initialRaised + allocationSum;

    console.log(
      JSON.stringify(
        {
          cycle: cycle.cycle_number,
          name: cycle.name,
          status: cycle.status,
          storedRaised: n(cycle.raised_capital),
          expectedRaised,
          delta: n(cycle.raised_capital) - expectedRaised,
          target: n(cycle.target_capital),
          fundTarget: n(fund.target_capital),
          initialRaised,
          allocationSum,
          investorCount: cycle.investor_count,
          progressPct:
            n(cycle.target_capital) > 0
              ? Math.round((expectedRaised / n(cycle.target_capital)) * 1000) / 10
              : null,
        },
        null,
        2
      )
    );
  }

  const displaySeed = n(fund.display_raised_capital);
  const activeCycle =
    (cycles ?? []).find((c) =>
      ["funding", "trading", "distribution", "approved"].includes(c.status)
    ) ?? cycles?.[(cycles?.length ?? 1) - 1];

  if (activeCycle) {
    const initialRaised = readInitialRaised(activeCycle.pool_config_snapshot);
    const { data: allocs } = await db
      .from("investment_allocations")
      .select("amount, status")
      .eq("investment_cycle_id", activeCycle.id);
    const allocationSum = (allocs ?? [])
      .filter((a) => RAISED_STATUSES.includes(a.status))
      .reduce((sum, a) => sum + n(a.amount), 0);
    const liveRaised = initialRaised + allocationSum;
    const publicDisplay = displaySeed > 0 ? displaySeed + liveRaised : liveRaised;

    console.log("\n=== MARKETPLACE DISPLAY MATH ===");
    console.log(
      JSON.stringify(
        {
          fund: fund.name,
          display_raised_capital_seed: displaySeed,
          liveRaised,
          publicDisplayRaised: publicDisplay,
          target: n(activeCycle.target_capital) || n(fund.target_capital),
          note:
            displaySeed > 0
              ? "Public raised = display_raised_capital seed + live allocations (may inflate totals)"
              : "Public raised = live only",
        },
        null,
        2
      )
    );
  }
}

const { data: profiles } = await db
  .from("profiles")
  .select("id, full_name, email")
  .or(`full_name.ilike.%${investorQuery}%,email.ilike.%${investorQuery}%`);

console.log(`\n=== INVESTOR: ${investorQuery} ===`);
console.log(JSON.stringify(profiles, null, 2));

for (const profile of profiles ?? []) {
  const { data: portfolios } = await db
    .from("investor_portfolios")
    .select("fund_id, total_invested, total_deposits, current_value, available_balance")
    .eq("user_id", profile.id);

  const { data: allocs } = await db
    .from("investment_allocations")
    .select("id, investment_cycle_id, amount, status, reference_number, created_at")
    .eq("investor_id", profile.id);

  const { data: txs } = await db
    .from("transactions")
    .select("id, fund_id, type, amount, status, reference, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const { data: positions } = await db
    .from("pool_investor_positions")
    .select("fund_id, capital, is_virtual")
    .eq("investor_id", profile.id);

  const cycleIds = [...new Set((allocs ?? []).map((a) => a.investment_cycle_id))];
  let cyclesById = new Map();
  if (cycleIds.length > 0) {
    const { data: cycleRows } = await db
      .from("investment_cycles")
      .select("id, name, fund_id, status")
      .in("id", cycleIds);
    cyclesById = new Map((cycleRows ?? []).map((c) => [c.id, c]));
  }

  const fundIds = [
    ...new Set([
      ...(portfolios ?? []).map((p) => p.fund_id),
      ...(allocs ?? []).map((a) => cyclesById.get(a.investment_cycle_id)?.fund_id).filter(Boolean),
    ]),
  ];

  let fundNames = new Map();
  if (fundIds.length > 0) {
    const { data: fundRows } = await db.from("funds").select("id, name").in("id", fundIds);
    fundNames = new Map((fundRows ?? []).map((f) => [f.id, f.name]));
  }

  console.log(`\n--- ${profile.full_name ?? profile.email} (${profile.id}) ---`);
  console.log("Portfolios:", JSON.stringify(portfolios, null, 2));
  console.log(
    "Allocations:",
    JSON.stringify(
      (allocs ?? []).map((a) => ({
        ...a,
        cycle: cyclesById.get(a.investment_cycle_id)?.name,
        fund: fundNames.get(cyclesById.get(a.investment_cycle_id)?.fund_id),
      })),
      null,
      2
    )
  );
  console.log("Positions:", JSON.stringify(positions, null, 2));
  console.log("Recent transactions:", JSON.stringify(txs, null, 2));

  for (const portfolio of portfolios ?? []) {
    const fundName = fundNames.get(portfolio.fund_id) ?? portfolio.fund_id;
    const fundAllocs = (allocs ?? []).filter(
      (a) => cyclesById.get(a.investment_cycle_id)?.fund_id === portfolio.fund_id
    );
    const activeTradingCycle = [...fundAllocs]
      .map((a) => cyclesById.get(a.investment_cycle_id))
      .find((c) => c && ["trading", "distribution"].includes(c.status));
    const cycleAllocation = activeTradingCycle
      ? fundAllocs
          .filter(
            (a) =>
              a.investment_cycle_id === activeTradingCycle.id &&
              RAISED_STATUSES.includes(a.status)
          )
          .reduce((s, a) => s + n(a.amount), 0)
      : 0;

    const displayWouldShow =
      activeTradingCycle && cycleAllocation > 0 ? cycleAllocation : n(portfolio.total_invested);

    console.log(
      JSON.stringify(
        {
          fund: fundName,
          portfolio_total_invested: n(portfolio.total_invested),
          portfolio_total_deposits: n(portfolio.total_deposits),
          activeTradingCycle: activeTradingCycle?.name ?? null,
          cycleAllocationAmount: cycleAllocation,
          ui_displayCapitalInvested: displayWouldShow,
          doubleCountRisk:
            activeTradingCycle &&
            cycleAllocation > 0 &&
            n(portfolio.total_invested) > cycleAllocation
              ? `Portfolio (${n(portfolio.total_invested)}) differs from cycle allocation (${cycleAllocation})`
              : null,
        },
        null,
        2
      )
    );
  }
}
