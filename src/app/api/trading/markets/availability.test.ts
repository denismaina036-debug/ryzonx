import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/services/trading/http", () => ({ tradingIdentity: vi.fn(async () => ({ id: "user" })), apiData: (data: unknown) => Response.json(data), apiError: (error: string, status: number) => Response.json({ error }, { status }) }));
vi.mock("@/services/trading/repository", () => ({ readCatalogue: vi.fn() }));
vi.mock("@/services/trading/provider", () => ({ freeMarketData: { providerName: "BiQuote", getQuotes: vi.fn() } }));
import { readCatalogue } from "@/services/trading/repository";
import { freeMarketData } from "@/services/trading/provider";
import { GET } from "./route";

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(readCatalogue).mockResolvedValue({
    instruments: [
      { symbol: "BTCUSD", asset_class: "crypto", enabled: true, featured: true },
      { symbol: "ETHUSD", asset_class: "crypto", enabled: true, featured: false },
      { symbol: "SOLUSD", asset_class: "crypto", enabled: false },
      { symbol: "EURUSD", asset_class: "forex", enabled: true },
    ], classes: [{ asset_class: "crypto", enabled: true }, { asset_class: "forex", enabled: false }],
  } as Awaited<ReturnType<typeof readCatalogue>>);
  vi.mocked(freeMarketData.getQuotes).mockResolvedValue({ BTCUSD: { ok: false, error: "network_error" }, ETHUSD: { ok: false, error: "unknown_instrument" } });
});
it("checks non-featured markets and retains missing-data markets but respects admin controls", async () => {
  const response = await GET(new Request("http://localhost/api/trading/markets"));
  expect(freeMarketData.getQuotes).toHaveBeenCalledWith(["BTCUSD", "ETHUSD"]);
  expect((await response.json()).instruments.map((i: { symbol: string }) => i.symbol)).toEqual(["BTCUSD", "ETHUSD"]);
});
