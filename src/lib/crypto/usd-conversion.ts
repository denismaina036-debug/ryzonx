/** USD-pegged stablecoins — 1 unit ≈ $1 for deposit display. */
export const USD_STABLECOIN_SYMBOLS = new Set(["USDT", "USDC", "BUSD", "DAI"]);

export function isUsdStablecoin(symbol: string): boolean {
  return USD_STABLECOIN_SYMBOLS.has(symbol.toUpperCase());
}

export function convertUsdToCryptoAmount(usdAmount: number, symbol: string, usdPrice: number): number {
  if (usdAmount <= 0) return 0;
  if (isUsdStablecoin(symbol) || usdPrice <= 0) return usdAmount;
  return usdAmount / usdPrice;
}

export function formatCryptoAmount(amount: number, symbol: string): string {
  if (isUsdStablecoin(symbol)) {
    return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const decimals = amount >= 1 ? 4 : 8;
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}
