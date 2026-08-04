import { formatCryptoAmount } from "@/lib/crypto/usd-conversion";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

export interface CryptoDepositMeta {
  usdAmount: number;
  cryptoSymbol: string | null;
  cryptoNetwork: string | null;
  cryptoAmount: number | null;
}

export function resolveCryptoDepositFields(row: {
  amount: number | string;
  notes?: string | null;
  crypto_symbol?: string | null;
  crypto_network?: string | null;
  crypto_amount?: number | string | null;
}): CryptoDepositMeta {
  const usdAmount = toNumber(row.amount);
  let cryptoSymbol = row.crypto_symbol ?? null;
  let cryptoNetwork = row.crypto_network ?? null;
  const cryptoAmount =
    row.crypto_amount != null ? toNumber(row.crypto_amount) : null;

  if (!cryptoSymbol && row.notes?.includes("Crypto deposit")) {
    const match = row.notes.match(/Crypto deposit — (\w+) on (\w+)/);
    if (match) {
      cryptoSymbol = match[1] ?? null;
      cryptoNetwork = match[2] ?? null;
    }
  }

  return { usdAmount, cryptoSymbol, cryptoNetwork, cryptoAmount };
}

export function formatCryptoDepositAssetLabel(
  cryptoSymbol: string | null,
  cryptoNetwork: string | null
): string {
  if (!cryptoSymbol) return "—";
  if (cryptoNetwork) return `${cryptoSymbol} · ${cryptoNetwork}`;
  return cryptoSymbol;
}

export function formatCryptoDepositEstimate(
  cryptoAmount: number | null,
  cryptoSymbol: string | null
): string | null {
  if (cryptoAmount == null || cryptoAmount <= 0 || !cryptoSymbol) return null;
  return `≈ ${formatCryptoAmount(cryptoAmount, cryptoSymbol)} ${cryptoSymbol}`;
}
