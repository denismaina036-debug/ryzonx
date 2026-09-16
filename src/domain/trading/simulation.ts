import { z } from "zod";
import { decimalSchema, type Side } from "./models";
import { calculatePL, calculatePLPercent, calculateUnits, decimal, decimalString, portfolioValue, positionValue } from "./calculations";
import { executableQuote, normalizeQuote, type Quote } from "./market-data";
import { usableFreeQuote } from "./market-availability";
export const virtualOpenSchema = z.object({ symbol: z.string().regex(/^[A-Z0-9.]{1,24}$/), side: z.enum(["BUY", "SELL"]), amount: z.string().refine(v => /^\d{1,18}(\.\d{1,2})?$/.test(v) && decimal(v) > BigInt(0)) }).strict();
export type VirtualOpen = z.infer<typeof virtualOpenSchema>;
const signed = z.string().regex(/^-?\d+(\.\d{1,12})?$/);
export const openTradeSchema = z.object({ instrument: z.string().uuid(), side: z.enum(["BUY", "SELL"]), amount: decimalSchema.refine(v => decimal(v)>BigInt(0)), stopLoss: decimalSchema.nullable().default(null), takeProfit: decimalSchema.nullable().default(null), idempotencyKey: z.string().uuid() }).strict();
export const closeTradeSchema = z.object({ position: z.string().uuid(), idempotencyKey: z.string().uuid() }).strict();
export type OpenTrade = z.infer<typeof openTradeSchema>;
export const accountSchema = z.object({ user_id: z.string().uuid(), environment: z.literal("SIMULATED"), currency: z.literal("USD"), cash: signed, starting_cash: signed, realized_pl: signed });
export const positionSchema = z.object({ id: z.string().uuid(), user_id: z.string().uuid(), instrument_id: z.string().uuid(), environment: z.literal("SIMULATED"), currency: z.literal("USD"), side: z.enum(["BUY","SELL"]), status: z.enum(["OPEN","CLOSED"]), invested_amount: signed, units: signed, opening_price: signed, closing_price: signed.nullable(), stop_loss: signed.nullable(), take_profit: signed.nullable(), realized_pl: signed.nullable(), opened_at: z.string(), closed_at: z.string().nullable(), opening_quote_timestamp: z.string(), closing_quote_timestamp: z.string().nullable(), opening_quote_source: z.enum(["twelve_data", "biquote"]), closing_quote_source: z.literal("twelve_data").nullable(), opening_price_basis: z.enum(["BID","ASK","LAST"]), closing_price_basis: z.enum(["BID","ASK","LAST"]).nullable(), close_reason: z.enum(["MANUAL","STOP_LOSS","TAKE_PROFIT"]).nullable() });
export type SimulationPosition = z.infer<typeof positionSchema>;
export function executionPrice(quote: Quote, side: Side, now = Date.now()) {
  const valid = executableQuote(quote, now);
  if (!valid.ok || quote.source !== "twelve_data") throw new Error("A fresh, open-market Twelve Data quote is required.");
  return side === "BUY" ? quote.ask ?? quote.price : quote.bid ?? quote.price;
}
/** Opening uses the free-data policy; legacy settlement remains isolated. */
export function virtualExecutionPrice(quote: Quote, side: Side, now = Date.now()) {
  const valid = normalizeQuote(quote);
  if (!usableFreeQuote({ ok: true, data: valid }, now) || valid.marketState === "closed" || (valid.marketStatusKnown !== false && !valid.marketOpen)) throw new Error("A fresh eligible free quote is required.");
  const price = side === "BUY" ? valid.ask : valid.bid;
  if (price !== null) return price;
  if (valid.ask === null && valid.bid === null) return valid.price;
  throw new Error("An executable side price is unavailable.");
}
export function estimatedUnits(amount: string, price: string, precision: number) {
  const units = decimal(calculateUnits(amount, price)), step = BigInt(10) ** BigInt(12-precision);
  return decimalString(units / step * step);
}
export function markPosition(position: Pick<SimulationPosition,"side"|"opening_price"|"invested_amount"|"units">, price: string) {
  const raw = decimal(calculatePL(position.side, position.opening_price, price, position.units));
  const floor = -decimal(position.invested_amount);
  const pl = decimalString(raw < floor ? floor : raw);
  return { price, pl, plPercent: calculatePLPercent(pl, position.invested_amount), value: positionValue(position.invested_amount, pl) };
}
export function protectionReason(p: SimulationPosition, price: string, slEnabled: boolean, tpEnabled: boolean): "STOP_LOSS"|"TAKE_PROFIT"|null {
  const value=decimal(price);
  if (slEnabled && p.stop_loss && (p.side === "BUY" ? value<=decimal(p.stop_loss) : value>=decimal(p.stop_loss))) return "STOP_LOSS";
  if (tpEnabled && p.take_profit && (p.side === "BUY" ? value>=decimal(p.take_profit) : value<=decimal(p.take_profit))) return "TAKE_PROFIT";
  return null;
}
export function simulationTotals(cash: string, positions: { invested_amount: string; mark: ReturnType<typeof markPosition>|null }[]) {
  const complete = positions.every(p=>p.mark);
  return { cash, invested: portfolioValue("0",positions.map(p=>p.invested_amount)),
    unrealizedPL: complete ? portfolioValue("0",positions.map(p=>p.mark!.pl)) : null,
    positionValue: complete ? portfolioValue("0",positions.map(p=>p.mark!.value)) : null,
    portfolioValue: complete ? portfolioValue(cash,positions.map(p=>p.mark!.value)) : null };
}
