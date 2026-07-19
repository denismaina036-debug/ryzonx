import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

function readEnvLocal(key) {
  const envPath = join(projectRoot, ".env.local");
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    if (/^\s*#/.test(line) || !line.trim()) continue;
    const match = line.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*)\\s*$`));
    if (match) return match[1].trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

const projectRef =
  readEnvLocal("SUPABASE_PROJECT_REF") ??
  readEnvLocal("NEXT_PUBLIC_SUPABASE_URL")?.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
const password = readEnvLocal("SUPABASE_DB_PASSWORD");
const poolerFile = join(projectRoot, "supabase", ".temp", "pooler-url");
let poolerHost = "aws-0-eu-west-1.pooler.supabase.com";
try {
  const m = readFileSync(poolerFile, "utf8").trim().match(/postgres\.[^@]+@([^:/]+)/);
  if (m) poolerHost = m[1];
} catch {
  /* default */
}

const client = new pg.Client({
  connectionString: `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@${poolerHost}:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
const sql = readFileSync(join(projectRoot, "scripts", "v1-cleanup-validation.sql"), "utf8");
const { rows } = await client.query(sql);
for (const row of rows) console.log(JSON.stringify(row));
await client.end();
