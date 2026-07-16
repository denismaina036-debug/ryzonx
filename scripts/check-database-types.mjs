import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const typesPath = path.join(root, "src", "types", "database.types.ts");

if (!fs.existsSync(typesPath)) {
  console.error("Missing src/types/database.types.ts");
  process.exit(1);
}

const content = fs.readFileSync(typesPath, "utf8").trim();
if (content.length < 500 || !content.includes("export type Database")) {
  console.error(
    "src/types/database.types.ts is empty or corrupt. Restore it before running the app."
  );
  console.error("Do NOT run `npm run db:types` unless Supabase type generation works.");
  process.exit(1);
}

console.log("database.types.ts OK");
