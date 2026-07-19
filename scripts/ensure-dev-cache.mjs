/**
 * Clears .next before dev when the cache is stale or mixed with a production build.
 * Running `npm run build`/`verify` while dev is active corrupts manifests (ENOENT 500s).
 */
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const nextDir = join(root, ".next");

if (!existsSync(nextDir)) {
  process.exit(0);
}

const isProductionBuild = existsSync(join(nextDir, "BUILD_ID"));
const hasServerApp = existsSync(join(nextDir, "server", "app"));
const turbopackRuntime = join(nextDir, "server", "chunks", "ssr", "[turbopack]_runtime.js");
const hasBrokenTurbopackCache =
  existsSync(join(nextDir, "server", "pages", "_document.js")) && !existsSync(turbopackRuntime);

function findMissingDevManifests(dir, missing = []) {
  if (!existsSync(dir)) return missing;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      findMissingDevManifests(full, missing);
    } else if (entry.name === "page.js" || entry.name === "page.jsx") {
      const manifest = join(dir, "app-build-manifest.json");
      if (!existsSync(manifest)) {
        missing.push(manifest);
      }
    }
  }
  return missing;
}

const missingManifests = hasServerApp
  ? findMissingDevManifests(join(nextDir, "server", "app"))
  : [];

if (isProductionBuild || missingManifests.length > 0 || hasBrokenTurbopackCache) {
  const reason = isProductionBuild
    ? "production build artifacts"
    : hasBrokenTurbopackCache
      ? "broken turbopack SSR cache"
      : `incomplete dev manifests (${missingManifests.length} missing)`;
  console.warn(`[dev] Clearing .next (${reason})…`);
  rmSync(nextDir, { recursive: true, force: true });
}
