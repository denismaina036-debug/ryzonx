/**
 * Verify RLS on tables that were missing row-level security.
 * Usage: node scripts/verify-rls-security.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readEnvLocal(key) {
  const path = join(root, ".env.local");
  if (!existsSync(path)) return null;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (line.match(/^\s*#/) || !line.trim()) continue;
    const match = line.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*)\\s*$`));
    if (match) return match[1].trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

const url = readEnvLocal("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const serviceKey = readEnvLocal("SUPABASE_SERVICE_ROLE_KEY");

if (!url || !anonKey || !serviceKey) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const tables = [
  "trade_profit_allocations",
  "trade_loss_allocations",
  "transaction_reference_counters",
];

const anon = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let failed = false;

for (const table of tables) {
  const { data, error } = await anon.from(table).select("id").limit(1);
  if (error) {
    console.log(`OK  anon blocked on ${table}: ${error.code ?? error.message}`);
    continue;
  }
  if (!data || data.length === 0) {
    console.log(`OK  anon sees no rows on ${table}`);
    continue;
  }
  console.error(`FAIL anon can read ${table} (${data.length} row(s))`);
  failed = true;
}

for (const table of tables.slice(0, 2)) {
  const { error } = await admin.from(table).select("id").limit(1);
  if (error) {
    console.error(`FAIL service role cannot read ${table}: ${error.message}`);
    failed = true;
  } else {
    console.log(`OK  service role can read ${table}`);
  }
}

process.exit(failed ? 1 : 0);
