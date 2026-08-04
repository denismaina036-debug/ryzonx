import type { InvestorPoolActivityItem } from "@/features/investor/types";
import type { InvestorTransaction } from "@/features/investor/types/wallet";
import { buildTransactionPresentation } from "@/lib/transaction/presentation";

export type RawTransactionRow = {
  id: string;
  fund_id: string;
  type: string;
  amount: number | string;
  status: string;
  payment_method: string | null;
  reference: string | null;
  transaction_reference?: string | null;
  notes: string | null;
  admin_notes?: string | null;
  destination?: string | null;
  crypto_symbol?: string | null;
  crypto_network?: string | null;
  crypto_amount?: number | string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  processed_at?: string | null;
};

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function parseCryptoFromNotes(notes: string | null): {
  symbol: string | null;
  network: string | null;
} {
  if (!notes?.includes("Crypto deposit")) {
    return { symbol: null, network: null };
  }
  const match = notes.match(/Crypto deposit — (\w+) on (\w+)/);
  if (!match) return { symbol: null, network: null };
  return { symbol: match[1] ?? null, network: match[2] ?? null };
}

function toPresentationInput(row: RawTransactionRow, fundName: string) {
  const parsed = parseCryptoFromNotes(row.notes ?? null);
  return {
    id: row.id,
    type: row.type,
    amount: toNumber(row.amount),
    status: row.status,
    paymentMethod: row.payment_method,
    reference: row.reference,
    transactionReference: row.transaction_reference ?? null,
    notes: row.notes ?? null,
    adminNotes: row.admin_notes ?? null,
    destination: row.destination ?? null,
    fundId: row.fund_id,
    fundName,
    cryptoSymbol: row.crypto_symbol ?? parsed.symbol,
    cryptoNetwork: row.crypto_network ?? parsed.network,
    cryptoAmount:
      row.crypto_amount != null ? toNumber(row.crypto_amount) : null,
    createdAt: row.created_at,
    processedAt: row.processed_at ?? null,
    metadata: row.metadata ?? null,
  };
}

export function mapRawTransactionToInvestorTransaction(
  row: RawTransactionRow,
  fundName: string,
  poolWinRate: number | null = null
): InvestorTransaction {
  const input = toPresentationInput(row, fundName);
  const presentation = buildTransactionPresentation(input);

  return {
    id: row.id,
    type: row.type,
    amount: input.amount,
    status: row.status,
    paymentMethod: row.payment_method,
    reference: row.reference,
    transactionReference: row.transaction_reference ?? null,
    cryptoSymbol: input.cryptoSymbol,
    cryptoNetwork: input.cryptoNetwork,
    cryptoAmount: input.cryptoAmount,
    fundId: row.fund_id,
    fundName,
    poolWinRate,
    createdAt: row.created_at,
    processedAt: row.processed_at ?? null,
    title: presentation.title,
    subtitle: presentation.subtitle,
    category: presentation.category,
    iconKind: presentation.iconKind,
    amountPrefix: presentation.amountPrefix,
    amountSuffix: presentation.amountSuffix,
    statusLabel: presentation.statusLabel,
    isCredit: presentation.isCredit,
  };
}

export function mapRawTransactionToActivityItem(
  row: RawTransactionRow,
  fundName: string
): InvestorPoolActivityItem {
  const tx = mapRawTransactionToInvestorTransaction(row, fundName);
  return {
    id: tx.id,
    title: tx.title,
    subtitle: tx.subtitle,
    amount: tx.amount,
    amountPrefix: tx.amountPrefix,
    createdAt: tx.createdAt,
    category: tx.category,
    iconKind: tx.iconKind,
  };
}
