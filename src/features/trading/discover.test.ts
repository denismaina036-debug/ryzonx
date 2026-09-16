import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
vi.mock("./queries", () => ({ useMarkets: vi.fn(), useWatchlist: vi.fn() }));
import { useMarkets, useWatchlist, type MarketsData, type MarketInstrument } from "./queries";
import { Discover } from "./discover";
import { MarketCard } from "./market-components";
import s from "./trading.module.css";

const classes = ["stocks", "crypto", "forex", "commodities", "indices", "etfs"] as const;
const names = ["Apple", "Bitcoin", "Euro / US Dollar", "Gold", "S&P 500", "SPDR S&P 500 ETF"];
const symbols = ["AAPL", "BTCUSD", "EURUSD", "XAUUSD", "SPX500", "SPY"];
const instruments: MarketInstrument[] = classes.map((asset_class, index) => ({ id: `test-${index}`, symbol: symbols[index]!, name: names[index]!, asset_class, base_currency: null, quote_currency: "USD", currency: "USD", exchange: null, price_precision: 2, quantity_precision: 8, minimum_trade_amount: "10", maximum_trade_amount: null, buy_enabled: true, sell_enabled: true, trading_enabled: true, featured: true, market_status: "unknown", display_order: index, created_at: "2026-09-09T00:00:00Z", updated_at: "2026-09-09T00:00:00Z" }));
const data: MarketsData = { ready: true, settings: { trading_enabled: false, display_mode: "SIMULATION", execution_mode: "SIMULATED" }, classes: classes.map(asset_class => ({ asset_class, enabled: true })), instruments, quotes: {}, provider: { connected: false, name: "Not connected", status: "missing_configuration" } };
function render(dataOverride: MarketsData = data) {
  vi.mocked(useMarkets, { partial: true }).mockReturnValue({ data: dataOverride, isLoading: false, isError: false });
  vi.mocked(useWatchlist, { partial: true }).mockReturnValue({ data: { ids: [] }, isLoading: false, isError: false });
  return renderToStaticMarkup(createElement(Discover));
}
describe("Discover presentation integrity", () => {
  it("shows catalogue and honest missing-data states without fictional prices", () => {
    const html = render();
    expect(html).toContain("Explore Global Markets"); expect(html).toContain("Daily Movers"); expect(html).toContain("Popular Markets");
    expect(html).toContain("Available to Verified Traders"); expect(html).not.toContain("$100"); expect(html).toContain('href="/apply/pool-manager"'); expect(html).toContain("Become a Verified Trader"); expect(html).not.toContain("Quote unavailable");
    // Optional isolated static review of the actual component; never a public app route.
    const directory = process.env.TRADING_UI_REVIEW_DIR;
    if (directory) {
      mkdirSync(directory, { recursive: true });
      const css = readFileSync(join(process.cwd(), "src/features/trading/trading.module.css"), "utf8").replace(/\.([a-zA-Z][\w-]*)/g, (match, name: string) => s[name] ? `.${s[name]}` : match);
      writeFileSync(join(directory, "index.html"), `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Trading UI review fixture</title><style>*{box-sizing:border-box}body{margin:0;background:#edf1f7;font-family:Arial,sans-serif}a{text-decoration:none;color:inherit}button,input{font:inherit}nav{border:0}header{background:#162237;color:white;padding:24px 32px}main{max-width:1150px;margin:24px auto;padding:0 16px}${css}</style></head><body><header>RyvonX · Isolated UI review fixture · No account data</header><main>${html}</main></body></html>`);
    }
  });
  it("does not present disabled classes as navigable categories", () => {
    expect(render({ ...data, classes: [{ asset_class: "stocks", enabled: false }] })).not.toContain('href="/dashboard/discover/stocks"');
  });
  it("never renders a stale price as a current quote", () => {
    const html = renderToStaticMarkup(createElement(MarketCard, { instrument: instruments[0]!, result: { ok: true, data: { symbol: "AAPL", price: "987.65", bid: null, ask: null, change: "3", changePercent: "1", timestamp: "2000-01-01T00:00:00Z", marketOpen: true } } }));
    expect(html).not.toContain("987.65"); expect(html).toContain("Available to Verified Traders");
  });
});
