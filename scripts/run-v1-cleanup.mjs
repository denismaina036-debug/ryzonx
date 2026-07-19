/**
 * Run V1 strategy/pool data cleanup via direct Postgres connection.
 * Reads SUPABASE_DB_PASSWORD and project ref from .env.local
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

function readEnvLocal(key) {
  const envPath = join(projectRoot, ".env.local");
  let content;
  try {
    content = readFileSync(envPath, "utf8");
  } catch {
    throw new Error(".env.local not found. Add SUPABASE_DB_PASSWORD and NEXT_PUBLIC_SUPABASE_URL.");
  }
  for (const line of content.split("\n")) {
    if (/^\s*#/.test(line) || !line.trim()) continue;
    const match = line.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*)\\s*$`));
    if (match) {
      return match[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  return null;
}

function resolveProjectRef() {
  const explicit = readEnvLocal("SUPABASE_PROJECT_REF");
  if (explicit) return explicit;
  const url = readEnvLocal("NEXT_PUBLIC_SUPABASE_URL");
  const m = url?.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  if (m) return m[1];
  throw new Error("Could not resolve Supabase project ref from .env.local");
}

const projectRef = resolveProjectRef();
const password = readEnvLocal("SUPABASE_DB_PASSWORD");
if (!password) {
  throw new Error("SUPABASE_DB_PASSWORD missing from .env.local");
}

function resolvePoolerHost() {
  const poolerFile = join(projectRoot, "supabase", ".temp", "pooler-url");
  try {
    const poolerUrl = readFileSync(poolerFile, "utf8").trim();
    const m = poolerUrl.match(/postgres\.[^@]+@([^:/]+)/);
    if (m) return m[1];
  } catch {
    /* fall through */
  }
  return "aws-0-eu-west-1.pooler.supabase.com";
}

const poolerHost = resolvePoolerHost();
const connectionString = `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@${poolerHost}:5432/postgres`;

const sqlPath = join(projectRoot, "scripts", "v1-strategy-pool-data-cleanup.sql");
const sql = readFileSync(sqlPath, "utf8");

async function clearPoolImageStorage() {
  const supabaseUrl = readEnvLocal("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = readEnvLocal("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.warn("Skipping pool-images storage cleanup (missing Supabase URL or service role key).");
    return 0;
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let removed = 0;
  const pageSize = 100;
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase.storage.from("pool-images").list("", {
      limit: pageSize,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`pool-images list failed: ${error.message}`);
    if (!data?.length) break;

    const paths = data.filter((item) => item.name).map((item) => item.name);
    if (paths.length) {
      const { error: removeError } = await supabase.storage.from("pool-images").remove(paths);
      if (removeError) throw new Error(`pool-images remove failed: ${removeError.message}`);
      removed += paths.length;
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return removed;
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log(`Connected to Supabase Postgres (${projectRef})`);
  console.log("Running V1 strategy & pool data cleanup...\n");

  const result = await client.query(sql);

  const resultSets = Array.isArray(result) ? result : [result];
  console.log("--- SQL cleanup results ---");
  for (const r of resultSets) {
    for (const row of r.rows ?? []) {
      console.log(JSON.stringify(row));
    }
  }

  const storageRemoved = await clearPoolImageStorage().catch((err) => {
    console.warn(`Storage cleanup skipped: ${err.message}`);
    return null;
  });
  if (storageRemoved !== null) {
    console.log(JSON.stringify({ section: "storage", metric: "storage_pool_images", removed: storageRemoved }));
  }

  console.log("\nCleanup completed successfully.");
} catch (err) {
  console.error("Cleanup failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
