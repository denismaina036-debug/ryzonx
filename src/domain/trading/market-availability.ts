import { quoteFreshness, type DataResult, type Quote } from "./market-data";

export const VERIFIED_MARKET_MESSAGE = "Available to Verified Traders";

/** Only a current quote from the keyless route grants public market access. */
export function usableFreeQuote(result?: DataResult<Quote>, now = Date.now()): Quote | null {
  return result?.ok && result.data.source === "biquote" && quoteFreshness(result.data, now).ok ? result.data : null;
}
