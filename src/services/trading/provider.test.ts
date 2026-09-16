import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
describe("market-data provider selection", () => {
  it("selects keyless BiQuote without Twelve Data credentials", async () => {
    vi.stubEnv("TRADING_MARKET_DATA_PROVIDER", "biquote"); vi.stubEnv("TWELVE_DATA_API_KEY", "");
    const { marketData, providerStatus } = await import("./provider");
    expect(marketData.providerName).toBe("BiQuote"); expect(providerStatus().name).toBe("BiQuote");
  });
  it("preserves Twelve Data as a selectable provider", async () => {
    vi.stubEnv("TRADING_MARKET_DATA_PROVIDER", "twelve_data"); vi.stubEnv("TWELVE_DATA_API_KEY", "test-only-key");
    const { marketData, providerStatus } = await import("./provider");
    expect(marketData.providerName).toBe("Twelve Data"); expect(JSON.stringify(providerStatus())).not.toContain("test-only-key");
  });
});
