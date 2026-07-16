/**
 * Clears .next before dev when the cache is stale or mixed with a production build.
 * Running `npm run build`/`verify` while dev is active corrupts manifests (ENOENT 500s).
 */
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const nextDir = join(root, ".next");

if (!existsSync(nextDir)) {
  process.exit(0);
}

const isProductionBuild = existsSync(join(nextDir, "BUILD_ID"));
const devManifest = join(
  nextDir,
  "server",
  "app",
  "(dashboard)",
  "dashboard",
  "page",
  "app-build-manifest.json"
);
const hasServerApp = existsSync(join(nextDir, "server", "app"));
const missingDevManifest = hasServerApp && !existsSync(devManifest);

if (isProductionBuild || missingDevManifest) {
  const reason = isProductionBuild
    ? "production build artifacts"
    : "incomplete dev manifests";
  console.warn(`[dev] Clearing .next (${reason})…`);
  rmSync(nextDir, { recursive: true, force: true });
}
