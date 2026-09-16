import { z } from "zod";
import { decimal } from "./calculations";

export const ASSET_CLASSES = ["stocks", "crypto", "forex", "commodities", "indices", "etfs", "futures"] as const;
export type AssetClass = typeof ASSET_CLASSES[number];
export type ExecutionMode = "SIMULATED" | "LIVE";
export type Side = "BUY" | "SELL";
export const decimalSchema = z.string().regex(/^\d{1,18}(\.\d{1,12})?$/);
const positiveDecimal = decimalSchema.refine(value => decimal(value) > BigInt(0), "Must be positive");
export const settingsSchema = z.object({
  trading_enabled: z.boolean(),
  display_mode: z.enum(["SIMULATION", "LIVE_PREVIEW", "LIVE"]),
  execution_mode: z.literal("SIMULATED"),
  simulation_enabled: z.boolean().default(false), buy_enabled: z.boolean().default(true), sell_enabled: z.boolean().default(true),
  stop_loss_enabled: z.boolean().default(false), take_profit_enabled: z.boolean().default(false),
  default_simulation_balance: positiveDecimal.default("5000"),
}).strict();
export type TradingSettings = z.input<typeof settingsSchema>;
export const classSchema = z.object({ asset_class: z.enum(ASSET_CLASSES), enabled: z.boolean() })
  .strict().refine(value => value.asset_class !== "futures" || !value.enabled, "Futures are not available");
export type AssetClassControl = z.infer<typeof classSchema>;
export const instrumentControlsSchema = z.object({
  enabled: z.boolean().default(true),
  trading_enabled: z.boolean(), buy_enabled: z.boolean(), sell_enabled: z.boolean(),
  featured: z.boolean(), minimum_trade_amount: positiveDecimal,
  maximum_trade_amount: positiveDecimal.nullable(), display_order: z.number().int().min(0).max(100000),
}).strict().refine(value => value.maximum_trade_amount === null || decimal(value.maximum_trade_amount) >= decimal(value.minimum_trade_amount), "Maximum must be at least the minimum");
export type InstrumentControls = z.infer<typeof instrumentControlsSchema>;
export const instrumentSchema = z.object({
  id: z.string().uuid(), symbol: z.string().regex(/^[A-Z0-9.]{1,24}$/),
  provider_symbol: z.string().min(1), name: z.string().min(1), asset_class: z.enum(ASSET_CLASSES),
  base_currency: z.string().nullable(), quote_currency: z.string(), exchange: z.string().nullable(), currency: z.string(),
  price_precision: z.number().int().min(0).max(12), quantity_precision: z.number().int().min(0).max(12),
  minimum_trade_amount: z.coerce.string().pipe(positiveDecimal), maximum_trade_amount: z.coerce.string().pipe(positiveDecimal).nullable(),
  buy_enabled: z.boolean(), sell_enabled: z.boolean(), trading_enabled: z.boolean(), featured: z.boolean(),
  enabled: z.boolean().optional(),
  market_status: z.enum(["open", "closed", "unknown"]), display_order: z.number().int(),
  metadata: z.record(z.unknown()), created_at: z.string(), updated_at: z.string(),
});
export type Instrument = z.infer<typeof instrumentSchema>;
export function canonicalSymbol(value: string): string {
  return value.trim().toUpperCase().replace(/[\s/_-]/g, "");
}
export function matchesInstrument(instrument: Pick<Instrument, "symbol" | "name">, query: string): boolean {
  return canonicalSymbol(instrument.symbol).includes(canonicalSymbol(query)) || instrument.name.toLowerCase().includes(query.trim().toLowerCase());
}
export function eligibility(settings: TradingSettings, classes: AssetClassControl[], instrument: Omit<Instrument, "provider_symbol" | "metadata">, side: Side): string | null {
  if (settings.execution_mode !== "SIMULATED") return "Live execution is unavailable";
  if (!settings.trading_enabled) return "Trading is currently disabled";
  if (!settings.simulation_enabled) return "Simulation is currently disabled";
  if (side === "BUY" ? settings.buy_enabled === false : settings.sell_enabled === false) return `${side} is disabled`;
  if (instrument.asset_class === "futures" || !classes.find(item => item.asset_class === instrument.asset_class)?.enabled) return "This asset class is disabled";
  if (instrument.enabled === false || !instrument.trading_enabled) return "This market is disabled";
  if (instrument.currency !== "USD" || instrument.quote_currency !== "USD") return "USD markets only";
  if (!(side === "BUY" ? instrument.buy_enabled : instrument.sell_enabled)) return `${side} is disabled for this market`;
  return null;
}
export interface ExecutionTrace {
  readonly executionEnvironment: ExecutionMode;
  readonly correlationId: string;
  readonly orderId: string;
  readonly executionId?: string;
  readonly positionId?: string;
  readonly ledgerEventId?: string;
}
export interface FutureOrder extends ExecutionTrace {
  readonly userId: string; readonly instrumentId: string; readonly side: Side;
  readonly amount: string; readonly currency: "USD"; readonly leverage: 1;
}
export interface FuturePosition extends ExecutionTrace {
  readonly units: string; readonly openingPrice: string; readonly investedAmount: string;
  readonly side: Side; readonly currency: "USD"; readonly leverage: 1;
}
