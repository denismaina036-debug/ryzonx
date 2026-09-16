import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
vi.mock("server-only", () => ({}));
import { DevelopmentTradingStore, developmentCatalogueEnabled, initialDevelopmentState } from "./development-store";
import { matchesInstrument } from "@/domain/trading/models";
import { normalizeBiQuoteCatalogue } from "./biquote-catalogue";
const directories: string[] = [];
async function store() { const directory = await mkdtemp(join(tmpdir(), "ryvonx-trading-test-")); directories.push(directory); return new DevelopmentTradingStore(directory); }
afterEach(async () => { vi.unstubAllEnvs(); for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true }); });
describe("explicit development catalogue", () => {
  it("persists discovered markets without duplicating or changing existing controls", async () => {
    const repository = await store(); const before = await repository.read();
    const additions = normalizeBiQuoteCatalogue([{name:"NZDSGD",type:"Forex",description:"NZ Dollar / Singapore Dollar",currency:"USD",digits:5}]);
    await repository.importInstruments([...additions, ...before.instruments]);
    await repository.importInstruments(additions);
    const after = await repository.read();
    expect(after.instruments).toHaveLength(before.instruments.length + 1);
    expect(after.instruments.slice(0,before.instruments.length)).toEqual(before.instruments);
    expect(after.settings).toEqual(before.settings);
    await repository.saveWatchlist("user", additions[0]!.id, true);
    expect(await repository.watchlist("user")).toEqual([additions[0]!.id]);
  });
  it("is opt-in and cannot be selected in a production build", () => {
    vi.stubEnv("TRADING_CATALOGUE_SOURCE", "development"); vi.stubEnv("NODE_ENV", "production"); expect(developmentCatalogueEnabled()).toBe(false);
    vi.stubEnv("NODE_ENV", "development"); expect(developmentCatalogueEnabled()).toBe(true);
    vi.stubEnv("TRADING_CATALOGUE_SOURCE", "supabase"); expect(developmentCatalogueEnabled()).toBe(false);
  });
  it("contains the twenty requested instruments without prices or balances", () => {
    const state = initialDevelopmentState();
    expect(state.instruments).toHaveLength(20); expect(new Set(state.instruments.map(i => i.symbol)).size).toBe(20);
    expect(state.classes.filter(c => c.enabled)).toHaveLength(6); expect(state.classes.find(c => c.asset_class === "futures")?.enabled).toBe(false);
    expect(state.instruments.filter(i => i.featured)).toHaveLength(4);
    expect(state.instruments.find(i => i.symbol === "USDJPY")?.quote_currency).toBe("JPY");
    for (const instrument of state.instruments) { expect(instrument).not.toHaveProperty("price"); expect(instrument).not.toHaveProperty("balance"); }
  });
  it.each([["Gold", "XAUUSD"], ["XAUUSD", "XAUUSD"], ["Bitcoin", "BTCUSD"], ["BTC", "BTCUSD"], ["Apple", "AAPL"], ["AAPL", "AAPL"], ["EUR/USD", "EURUSD"]])("finds %s in the catalogue", (query, symbol) => {
    expect(initialDevelopmentState().instruments.filter(i => matchesInstrument(i, query)).map(i => i.symbol)).toContain(symbol);
  });
  it("persists admin changes and records before/after values", async () => {
    const repository = await store(); const state = await repository.read();
    await repository.update("admin", "settings", "platform", { ...state.settings, display_mode: "LIVE_PREVIEW" });
    await repository.update("admin", "class", "crypto", { asset_class: "crypto", enabled: false });
    const changed = await repository.read();
    expect(changed.settings.display_mode).toBe("LIVE_PREVIEW"); expect(changed.settings.execution_mode).toBe("SIMULATED");
    expect(changed.classes.find(c => c.asset_class === "crypto")?.enabled).toBe(false); expect(changed.audit).toHaveLength(2);
    expect(changed.audit[0]?.before).toEqual(state.settings);
    await expect(repository.update("admin", "settings", "platform", { ...state.settings, execution_mode: "LIVE" })).rejects.toThrow();
  });
  it("isolates watchlists and preserves concurrent writes", async () => {
    const repository = await store(); const state = await repository.read(); const first = state.instruments[0]!.id, second = state.instruments[1]!.id;
    await Promise.all([repository.saveWatchlist("user-a", first, true), repository.saveWatchlist("user-a", second, true), repository.saveWatchlist("user-b", second, true)]);
    expect(await repository.watchlist("user-a")).toEqual(expect.arrayContaining([first, second])); expect(await repository.watchlist("user-b")).toEqual([second]);
    expect((await repository.read()).settings).toEqual(state.settings);
  });
  it("keeps migration metadata aligned with the development catalogue", async () => {
    const sql = await readFile(join(process.cwd(), "supabase/migrations/00084_trading_stage_one.sql"), "utf8");
    for (const instrument of initialDevelopmentState().instruments) expect(sql).toContain(`('${instrument.symbol}',`);
    expect(sql).toContain("execution_mode = 'SIMULATED'"); expect(sql).toContain("enable row level security");
  });
});
