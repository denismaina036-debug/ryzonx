import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(
    process.cwd(),
    "src/features/pool-manager/components/journal/pm-journal-workspace.tsx"
  ),
  "utf8"
);

describe("record trade workflow", () => {
  it("collects prices and the authoritative dollar result without screenshot UI", () => {
    expect(source).toContain('label="Entry Price"');
    expect(source).toContain('label="Exit Price"');
    expect(source).toContain('label="Profit/Loss Amount (USD)"');
    expect(source).toContain("entryPrice,");
    expect(source).toContain("exitPrice,");
    expect(source).not.toContain("Upload Screenshot");
    expect(source).not.toContain("Screenshot URL");
    expect(source).not.toContain("uploadScreenshot");
    expect(source).not.toContain("screenshotFile");
  });
});
