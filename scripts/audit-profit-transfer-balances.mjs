/**
 * Audit funding wallet balances vs profit transfers.
 * Usage: node scripts/audit-profit-transfer-balances.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const DEFAULT_FUND = "00000000-0000-4000-a000-000000000001";

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

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const env = loadEnv();
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: transfers, error } = await db
  .from("transactions")
  .select("user_id, amount, created_at")
  .eq("payment_method", "profit_transfer")
  .eq("status", "completed");

if (error) {
  console.error(error.message);
  process.exit(1);
}

const userIds = [...new Set((transfers ?? []).map((t) => t.user_id))];
const { data: profiles } = await db
  .from("profiles")
  .select("id, full_name, email")
  .in("id", userIds);
const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

console.log("\n=== PROFIT TRANSFER BALANCE AUDIT ===\n");

for (const uid of userIds) {
  const userTransfers = (transfers ?? []).filter((t) => t.user_id === uid);
  const transferred = userTransfers.reduce((s, t) => s + n(t.amount), 0);

  const { data: wallet } = await db
    .from("investor_portfolios")
    .select("available_balance, total_deposits")
    .eq("user_id", uid)
    .eq("fund_id", DEFAULT_FUND)
    .maybeSingle();

  const { data: deployedRows } = await db
    .from("investor_portfolios")
    .select("total_invested")
    .eq("user_id", uid)
    .neq("fund_id", DEFAULT_FUND)
    .gt("total_invested", 0);

  const deployed = (deployedRows ?? []).reduce((s, r) => s + n(r.total_invested), 0);
  const depositCap = Math.max(0, Math.round((n(wallet?.total_deposits) - deployed) * 100) / 100);

  const { data: accounts } = await db
    .from("ledger_accounts")
    .select("id, code, account_type")
    .eq("owner_id", uid);

  let ledgerAvailable = 0;
  let reserved = 0;
  let settled = 0;

  for (const acct of accounts ?? []) {
    const { data: entries } = await db
      .from("ledger_entries")
      .select("entry_side, amount")
      .eq("account_id", acct.id);
    const debits = (entries ?? [])
      .filter((e) => e.entry_side === "debit")
      .reduce((s, e) => s + n(e.amount), 0);
    const credits = (entries ?? [])
      .filter((e) => e.entry_side === "credit")
      .reduce((s, e) => s + n(e.amount), 0);
    const bal =
      acct.account_type === "liability" ? credits - debits : debits - credits;
    if (acct.code.includes("AVAILABLE")) ledgerAvailable = bal;
    if (acct.code.includes("RESERVED")) reserved = bal;
    if (acct.code.includes("SETTLED")) settled = bal;
  }

  const legacy = n(wallet?.available_balance);
  const hasLedger = ledgerAvailable !== 0 || reserved !== 0 || settled !== 0;
  const projectionAvailable = hasLedger ? Math.max(0, ledgerAvailable) : legacy;
  const oldDisplay = Math.min(projectionAvailable, depositCap);
  const p = profileMap.get(uid);

  let issue = "ok";
  if (Math.abs(oldDisplay - transferred) > 0.01 && Math.abs(depositCap - oldDisplay) < 0.01) {
    issue = "deposit-cap-display";
  } else if (Math.abs(projectionAvailable - transferred) > 0.01) {
    issue = "balance-sync";
  } else if (Math.abs(legacy - transferred) > 0.01 && hasLedger) {
    issue = "legacy-not-synced";
  }

  console.log(
    JSON.stringify(
      {
        name: p?.full_name,
        email: p?.email,
        transferred,
        legacyAvailable: legacy,
        ledgerAvailable,
        depositCap,
        oldWouldShow: oldDisplay,
        correctDisplay: projectionAvailable,
        issue,
      },
      null,
      2
    )
  );
}
