import "server-only";
import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import seed from "../../../config/trading/development-catalogue.json";
import { ASSET_CLASSES, classSchema, instrumentControlsSchema, instrumentSchema, settingsSchema, type Instrument } from "@/domain/trading/models";
import { newCatalogueInstruments } from "./biquote-catalogue";
import type { Json } from "@/types/database.types";

export function developmentCatalogueEnabled() {
  return process.env.NODE_ENV === "development" && process.env.TRADING_CATALOGUE_SOURCE === "development";
}
const stateSchema = z.object({
  version: z.literal(1), settings: settingsSchema, classes: z.array(classSchema), instruments: z.array(instrumentSchema),
  watchlists: z.record(z.array(z.string().uuid())),
  audit: z.array(z.object({ actorId: z.string(), target: z.string(), before: z.unknown(), after: z.unknown(), timestamp: z.string() })),
});
type State = z.infer<typeof stateSchema>;
export function initialDevelopmentState(): State {
  return stateSchema.parse({ version: 1, settings: { trading_enabled: false, display_mode: "SIMULATION", execution_mode: "SIMULATED" },
    classes: ASSET_CLASSES.map(asset_class => ({ asset_class, enabled: asset_class !== "futures" })), instruments: seed, watchlists: {}, audit: [] });
}

/** Explicit local adapter, never a fallback after a Supabase error. No financial data.
 * File lock + atomic rename prevent overlapping dev-server writes from losing edits.
 */
export class DevelopmentTradingStore {
  constructor(private directory: string) {}
  private get path() { return join(this.directory, "trading-stage1.json"); }
  async read(): Promise<State> {
    try { return stateSchema.parse(JSON.parse(await readFile(this.path, "utf8"))); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return this.mutate(state => state);
    }
  }
  private async mutate<T>(change: (state: State) => T): Promise<T> {
    await mkdir(this.directory, { recursive: true });
    const lockPath = join(this.directory, "trading-stage1.lock");
    let lock;
    for (let attempt = 0; attempt < 40; attempt++) {
      try { lock = await open(lockPath, "wx"); break; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; await new Promise(resolve => setTimeout(resolve, 25)); }
    }
    if (!lock) throw new Error("Local trading configuration is busy");
    const temporary = join(this.directory, `${randomUUID()}.tmp`);
    try {
      let state: State;
      try { state = stateSchema.parse(JSON.parse(await readFile(this.path, "utf8"))); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; state = initialDevelopmentState(); }
      const result = change(state);
      const file = await open(temporary, "wx");
      try { await file.writeFile(JSON.stringify(stateSchema.parse(state), null, 2)); await file.sync(); }
      finally { await file.close(); }
      await rename(temporary, this.path);
      return result;
    } finally {
      await unlink(temporary).catch(() => undefined);
      await lock.close(); await unlink(lockPath);
    }
  }
  async update(actorId: string, kind: string, target: string, value: Json) {
    await this.mutate(state => {
      let before: unknown, after: unknown;
      if (kind === "settings") { before = state.settings; after = state.settings = settingsSchema.parse(value); }
      else if (kind === "class") {
        const index = state.classes.findIndex(c => c.asset_class === target);
        if (index < 0) throw new Error("Unknown asset class");
        before = state.classes[index]; after = state.classes[index] = classSchema.parse(value);
      } else if (kind === "instrument") {
        const index = state.instruments.findIndex(i => i.id === target);
        if (index < 0) throw new Error("Unknown instrument");
        before = state.instruments[index];
        after = state.instruments[index] = instrumentSchema.parse({ ...state.instruments[index], ...instrumentControlsSchema.parse(value), updated_at: new Date().toISOString() });
      } else throw new Error("Unknown configuration target");
      state.audit.push({ actorId, target: `${kind}:${target}`, before, after, timestamp: new Date().toISOString() });
    });
  }
  async importInstruments(instruments: Instrument[]) {
    await this.mutate(state => { state.instruments.push(...newCatalogueInstruments(state.instruments, instruments)); });
  }
  async watchlist(userId: string) { return (await this.read()).watchlists[userId] ?? []; }
  async saveWatchlist(userId: string, instrumentId: string, saved: boolean) {
    await this.mutate(state => {
      if (!state.instruments.some(i => i.id === instrumentId)) throw new Error("Unknown instrument");
      const ids = new Set(state.watchlists[userId] ?? []);
      if (saved) ids.add(instrumentId); else ids.delete(instrumentId);
      state.watchlists[userId] = [...ids];
    });
  }
}
export const developmentTradingStore = new DevelopmentTradingStore(join(process.cwd(), ".local"));
