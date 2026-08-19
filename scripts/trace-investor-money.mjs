/** Deep trace for a single investor's money flow. */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

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

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const investorQuery = process.argv[2] ?? "thureya";
const env = loadEnv();
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: profiles } = await db
  .from("profiles")
  .select("id, full_name, email")
  .or(`full_name.ilike.%${investorQuery}%,email.ilike.%${investorQuery}%`);

const profile = profiles?.[0];
if (!profile) {
  console.log("No profile found");
  process.exit(0);
}

console.log("Investor:", profile.full_name, profile.email, profile.id);

const { data: wallet } = await db
  .from("investor_wallets")
  .select("*")
  .eq("user_id", profile.id)
  .maybeSingle();
console.log("\n=== INVESTOR WALLET ===");
console.log(JSON.stringify(wallet, null, 2));

const { data: portfolio } = await db
  .from("investor_portfolios")
  .select("*")
  .eq("user_id", profile.id);
console.log("\n=== ALL PORTFOLIOS ===");
console.log(JSON.stringify(portfolio, null, 2));

const { data: accounts } = await db
  .from("ledger_accounts")
  .select("*")
  .eq("owner_id", profile.id);
console.log("\n=== LEDGER ACCOUNTS (owner_id) ===");
console.log(JSON.stringify(accounts, null, 2));

const { data: investorAccounts } = await db
  .from("ledger_accounts")
  .select("*")
  .ilike("code", `%${profile.id.slice(0, 8)}%`);
console.log("\n=== LEDGER ACCOUNTS (code match) ===");
console.log(JSON.stringify(investorAccounts, null, 2));

if (accounts?.length) {
  const ids = accounts.map((a) => a.id);
  const { data: entries } = await db
    .from("ledger_entries")
    .select("*, ledger_transactions(description, transaction_type, source_type, created_at)")
    .in("account_id", ids)
    .order("created_at", { ascending: true });
  console.log("\n=== LEDGER ENTRIES ===");
  console.log(JSON.stringify(entries, null, 2));
}

const { data: ledger } = await db
  .from("wallet_ledger_entries")
  .select("*")
  .eq("user_id", profile.id)
  .order("created_at", { ascending: true });
console.log("\n=== WALLET LEDGER (legacy table) ===");
console.log(JSON.stringify(ledger, null, 2));

const { data: txs } = await db
  .from("transactions")
  .select("*")
  .eq("user_id", profile.id)
  .order("created_at", { ascending: true });
console.log("\n=== ALL TRANSACTIONS ===");
for (const tx of txs ?? []) {
  console.log(JSON.stringify({
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    status: tx.status,
    fund_id: tx.fund_id,
    payment_method: tx.payment_method,
    reference: tx.reference,
    notes: tx.notes,
    metadata: tx.metadata,
    created_at: tx.created_at,
  }));
}

const { data: allocs } = await db
  .from("investment_allocations")
  .select("*, investment_cycles(name, fund_id, funds(name))")
  .eq("investor_id", profile.id);
console.log("\n=== ALLOCATIONS ===");
console.log(JSON.stringify(allocs, null, 2));
