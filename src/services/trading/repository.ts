import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, getServerEnv } from "@/lib/env";
import { z } from "zod";
import { classSchema, instrumentSchema, settingsSchema, type AssetClassControl, type Instrument, type TradingSettings } from "@/domain/trading/models";
import type { Json } from "@/types/database.types";
import { developmentCatalogueEnabled, developmentTradingStore } from "./development-store";
import { discoverFreeInstruments } from "./provider";
import { newCatalogueInstruments } from "./biquote-catalogue";

// Additive schema boundary until generated Database includes migration 00084.
// Runtime validation remains mandatory: NUMERIC arrives as JSON number/string.
type Table<Row extends Record<string, unknown>> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
type TradingDatabase = { public: {
  Tables: {
    trading_settings: Table<TradingSettings & { id: boolean; updated_at: string }>;
    trading_asset_classes: Table<AssetClassControl>;
    trading_instruments: Table<Instrument>;
    trading_watchlist: Table<{ user_id: string; instrument_id: string; created_at: string }>;
  };
  Views: Record<string, never>;
  Functions: { update_trading_configuration: { Args: { p_actor: string; p_kind: string; p_target: string; p_value: Json }; Returns: undefined } };
} };
function db() {
  return createClient<TradingDatabase>(env.NEXT_PUBLIC_SUPABASE_URL, getServerEnv().SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
export interface Catalogue {
  ready: boolean; settings: TradingSettings; classes: AssetClassControl[]; instruments: Instrument[];
  source: "development" | "supabase";
  problem?: "missing_schema" | "invalid_configuration" | "database_unavailable";
}
export async function readCatalogue(): Promise<Catalogue> {
  if (developmentCatalogueEnabled()) {
    let state = await developmentTradingStore.read();
    const additions = newCatalogueInstruments(state.instruments, await discoverFreeInstruments());
    if (additions.length) {
      await developmentTradingStore.importInstruments(additions);
      state = await developmentTradingStore.read();
    }
    return { ready: true, source: "development", settings: state.settings, classes: state.classes, instruments: [...state.instruments].sort((a,b) => a.display_order - b.display_order || a.symbol.localeCompare(b.symbol)) };
  }
  let problem: Catalogue["problem"] = "database_unavailable";
  try {
    const client = db();
    const [settings, classes, instruments] = await Promise.all([
      client.from("trading_settings").select("*,default_simulation_balance::text").eq("id", true).single(),
      client.from("trading_asset_classes").select("asset_class,enabled"),
      // Cast NUMERIC to text in PostgREST: never lose decimal precision in JSON.
      client.from("trading_instruments").select("*,minimum_trade_amount::text,maximum_trade_amount::text").order("display_order").order("symbol"),
    ]);
    const errors = [settings.error, classes.error, instruments.error].filter(Boolean);
    if (errors.length) {
      if (errors.some(e => e?.code === "PGRST205" || e?.code === "42P01")) problem = "missing_schema";
      throw new Error("Catalogue unavailable");
    }
    problem = "invalid_configuration";
    const { id: _id, updated_at: _updated, ...controls } = settings.data!;
    const existing = z.array(instrumentSchema).parse(instruments.data);
    const additions = newCatalogueInstruments(existing, await discoverFreeInstruments());
    if (additions.length) {
      // Insert only: existing IDs, provider mappings and admin controls win.
      const imported = await client.from("trading_instruments").upsert(additions, { onConflict: "symbol", ignoreDuplicates: true }).select("*,minimum_trade_amount::text,maximum_trade_amount::text");
      if (!imported.error) existing.push(...z.array(instrumentSchema).parse(imported.data));
      else console.warn(JSON.stringify({ scope: "trading", event: "catalogue_import_failed" }));
    }
    return { ready: true, source: "supabase", settings: settingsSchema.parse(controls), classes: z.array(classSchema).parse(classes.data), instruments: existing };
  } catch {
    console.warn(JSON.stringify({ scope: "trading", event: "catalogue_unavailable", problem }));
    return { ready: false, source: "supabase", problem, settings: { trading_enabled: false, display_mode: "SIMULATION", execution_mode: "SIMULATED" }, classes: [], instruments: [] };
  }
}
export async function updateConfiguration(actorId: string, kind: string, target: string, value: Json): Promise<void> {
  if (developmentCatalogueEnabled()) return developmentTradingStore.update(actorId, kind, target, value);
  const { error } = await db().rpc("update_trading_configuration", { p_actor: actorId, p_kind: kind, p_target: target, p_value: value });
  if (error) {
    console.warn(JSON.stringify({ scope: "trading", event: "configuration_update_failed", kind, target }));
    throw new Error("Trading settings could not be saved");
  }
  console.info(JSON.stringify({ scope: "trading", event: "configuration_updated", kind, target }));
}
export async function readWatchlist(userId: string): Promise<string[]> {
  if (developmentCatalogueEnabled()) return developmentTradingStore.watchlist(userId);
  const { data, error } = await db().from("trading_watchlist").select("instrument_id").eq("user_id", userId);
  if (error) throw new Error("Watchlist unavailable");
  return data.map(item => item.instrument_id);
}
export async function setWatchlist(userId: string, instrumentId: string, saved: boolean): Promise<void> {
  if (developmentCatalogueEnabled()) return developmentTradingStore.saveWatchlist(userId, instrumentId, saved);
  const client = db();
  const { error } = saved
    ? await client.from("trading_watchlist").upsert({ user_id: userId, instrument_id: instrumentId }, { onConflict: "user_id,instrument_id", ignoreDuplicates: true })
    : await client.from("trading_watchlist").delete().eq("user_id", userId).eq("instrument_id", instrumentId);
  if (error) throw new Error("Watchlist could not be updated");
}
