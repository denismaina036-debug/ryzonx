import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  generateTransactionReference,
  resolveReferencePrefix,
} from "@/lib/transaction/reference";

type TransactionInsertPayload = Record<string, unknown> & {
  type: string;
  payment_method?: string | null;
  notes?: string | null;
};

export async function attachTransactionReference(
  db: SupabaseClient,
  transactionId: string,
  input: Pick<TransactionInsertPayload, "type" | "payment_method" | "notes">
): Promise<string> {
  const prefix = resolveReferencePrefix({
    type: input.type,
    paymentMethod: input.payment_method,
    notes: input.notes,
  });
  const transactionReference = await generateTransactionReference(db, prefix);

  const { error } = await db
    .from("transactions")
    .update({ transaction_reference: transactionReference } as never)
    .eq("id", transactionId);

  if (error) {
    throw new Error(error.message);
  }

  return transactionReference;
}

export async function insertTransactionWithReference(
  db: SupabaseClient,
  payload: TransactionInsertPayload
): Promise<{ id: string; transactionReference: string }> {
  const { data, error } = await db
    .from("transactions")
    .insert(payload as never)
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create transaction.");
  }

  const id = (data as { id: string }).id;
  const transactionReference = await attachTransactionReference(db, id, payload);
  return { id, transactionReference };
}

export function getTransactionDb(client?: SupabaseClient): SupabaseClient {
  return client ?? createAdminClient();
}
