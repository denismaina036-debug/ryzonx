import { isUsdStablecoin } from "@/lib/crypto/usd-conversion";

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  USDT: "tether",
  USDC: "usd-coin",
};

const priceCache = new Map<string, { price: number; fetchedAt: number }>();
const CACHE_MS = 60_000;

async function fetchUsdPrices(symbols: string[]): Promise<Map<string, number>> {
  const normalized = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const result = new Map<string, number>();

  for (const symbol of normalized) {
    if (isUsdStablecoin(symbol)) {
      result.set(symbol, 1);
      continue;
    }

    const cached = priceCache.get(symbol);
    if (cached && Date.now() - cached.fetchedAt < CACHE_MS) {
      result.set(symbol, cached.price);
    }
  }

  const toFetch = normalized.filter((symbol) => !result.has(symbol));
  if (toFetch.length === 0) return result;

  const ids = toFetch
    .map((symbol) => COINGECKO_IDS[symbol])
    .filter(Boolean);

  if (ids.length === 0) {
    for (const symbol of toFetch) {
      result.set(symbol, 1);
    }
    return result;
  }

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error("Price fetch failed");
    const data = (await res.json()) as Record<string, { usd?: number }>;

    for (const symbol of toFetch) {
      const id = COINGECKO_IDS[symbol];
      const price = id ? (data[id]?.usd ?? 0) : 0;
      const resolved = price > 0 ? price : 1;
      priceCache.set(symbol, { price: resolved, fetchedAt: Date.now() });
      result.set(symbol, resolved);
    }
  } catch {
    for (const symbol of toFetch) {
      result.set(symbol, priceCache.get(symbol)?.price ?? 1);
    }
  }

  return result;
}

export const cryptoPriceService = {
  async getUsdPrices(symbols: string[]): Promise<Map<string, number>> {
    return fetchUsdPrices(symbols);
  },

  async convertUsdToCrypto(usdAmount: number, symbol: string): Promise<number> {
    const prices = await fetchUsdPrices([symbol]);
    const price = prices.get(symbol.toUpperCase()) ?? 1;
    if (isUsdStablecoin(symbol) || price <= 0) return usdAmount;
    return usdAmount / price;
  },
};
