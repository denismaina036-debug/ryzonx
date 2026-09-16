import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { env, getServerEnv } from "@/lib/env";
const accountSchema = z.object({
  user_id: z.string().uuid(), cash_usd: z.string().regex(/^\d+\.\d{2}$/),
  starting_balance_usd: z.string().regex(/^\d+\.\d{2}$/),
  created_at: z.string().datetime({ offset: true }), updated_at: z.string().datetime({ offset: true }),
});
export type VirtualAccount = z.infer<typeof accountSchema>;
type Database = { public: { Tables: Record<string, never>; Views: Record<string, never>; Functions: {
  ensure_virtual_trading_account: { Args: { p_user: string }; Returns: unknown };
} } };
export async function readVirtualAccount(userId: string): Promise<VirtualAccount> {
  const id = z.string().uuid().parse(userId);
  const client = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, getServerEnv().SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.rpc("ensure_virtual_trading_account", { p_user: id });
  if (error) throw new Error("Virtual account unavailable. Please try again shortly.");
  const account = accountSchema.parse(data);
  if (account.user_id !== id) throw new Error("Virtual account unavailable.");
  return account;
}
