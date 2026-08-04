"use client";

import { useEffect, useState } from "react";
import { convertUsdToCryptoAmount } from "@/lib/crypto/usd-conversion";

export function useCryptoUsdPrices(symbols: string[]) {
  const [prices, setPrices] = useState<Map<string, number>>(new Map());
  const key = symbols.map((s) => s.toUpperCase()).sort().join(",");

  useEffect(() => {
    if (!key) return;

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/crypto/prices?symbols=${encodeURIComponent(key)}`);
        const data = (await res.json()) as { prices?: Record<string, number> };
        if (!res.ok || !data.prices || cancelled) return;
        setPrices(new Map(Object.entries(data.prices)));
      } catch {
        /* keep last prices */
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [key]);

  function cryptoEquivalent(usdAmount: number, symbol: string): number | null {
    if (!Number.isFinite(usdAmount) || usdAmount <= 0) return null;
    const price = prices.get(symbol.toUpperCase());
    if (price == null) return null;
    return convertUsdToCryptoAmount(usdAmount, symbol, price);
  }

  return { prices, cryptoEquivalent };
}
