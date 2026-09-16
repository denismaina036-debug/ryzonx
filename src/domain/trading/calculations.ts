/** Fixed-point decimal strings, 12 places, truncation toward zero. No persisted floats.
 * Stage 2 must define settlement rounding and residual accounting explicitly.
 */
const SCALE = BigInt("1000000000000");
export function decimal(value: string): bigint {
  if (!/^-?\d{1,18}(\.\d{1,12})?$/.test(value)) throw new Error("Invalid decimal");
  const negative = value.startsWith("-");
  const [whole = "0", fraction = ""] = value.replace("-", "").split(".");
  const result = BigInt(whole) * SCALE + BigInt(fraction.padEnd(12, "0"));
  return negative ? -result : result;
}
export function decimalString(value: bigint): string {
  const negative = value < BigInt(0);
  const absolute = negative ? -value : value;
  const fraction = (absolute % SCALE).toString().padStart(12, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${absolute / SCALE}${fraction ? `.${fraction}` : ""}`;
}
export function calculateUnits(amount: string, openingPrice: string): string {
  const investment = decimal(amount), price = decimal(openingPrice);
  if (investment <= BigInt(0) || price <= BigInt(0)) throw new Error("Amount and price must be positive");
  return decimalString(investment * SCALE / price);
}
export function calculatePL(side: "BUY" | "SELL", opening: string, current: string, units: string): string {
  const open = decimal(opening), now = decimal(current), quantity = decimal(units);
  if (open <= BigInt(0) || now <= BigInt(0) || quantity < BigInt(0)) throw new Error("Invalid position values");
  return decimalString((side === "BUY" ? now - open : open - now) * quantity / SCALE);
}
export function calculatePLPercent(pl: string, invested: string): string {
  const basis = decimal(invested);
  if (basis <= BigInt(0)) throw new Error("Investment must be positive");
  return decimalString(decimal(pl) * SCALE * BigInt(100) / basis);
}
export function positionValue(invested: string, pl: string): string {
  return decimalString(decimal(invested) + decimal(pl));
}
export function portfolioValue(cash: string, positions: string[]): string {
  return decimalString(positions.reduce((sum, value) => sum + decimal(value), decimal(cash)));
}
