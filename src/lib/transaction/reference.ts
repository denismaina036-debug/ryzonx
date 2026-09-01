import type { SupabaseClient } from "@supabase/supabase-js";

export type TransactionRefPrefix =
  | "DEP"
  | "WDL"
  | "INV"
  | "STL"
  | "PFT"
  | "LSS"
  | "ADJ"
  | "COM"
  | "RWD"
  | "REF"
  | "BNS";

export function resolveReferencePrefix(input: {
  type: string;
  paymentMethod?: string | null;
  notes?: string | null;
}): TransactionRefPrefix {
  const type = input.type.toLowerCase();
  const method = (input.paymentMethod ?? "").toLowerCase();
  const notes = (input.notes ?? "").toLowerCase();

  if (type === "deposit") return "DEP";
  if (type === "withdrawal") return "WDL";
  if (method === "pool_allocation" || method === "profit_reinvest") return "INV";
  if (method === "pool_exit") return "STL";
  if (method === "profit_transfer") return "PFT";
  if (method === "cycle_loss") return "LSS";
  if (method === "trade_profit") return notes.includes("loss") ? "LSS" : "PFT";
  if (method === "pm_admission_fee" || method === "challenge_fee") return "COM";
  if (method === "reward") return "RWD";
  if (method === "refund") return "REF";
  if (method === "bonus") return "BNS";
  return "ADJ";
}

export async function generateTransactionReference(
  db: SupabaseClient,
  prefix: TransactionRefPrefix
): Promise<string> {
  const { data, error } = await db.rpc("next_transaction_reference", {
    p_prefix: prefix,
  });

  if (!error && typeof data === "string" && data.length > 0) {
    return data;
  }

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `RVX-${prefix}-${date}-${suffix}`;
}
