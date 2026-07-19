import { createAdminClient } from "@/lib/supabase/admin";

export async function resolvePoolManagerUserId(poolManagerId: string): Promise<string | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("pool_managers")
    .select("user_id")
    .eq("id", poolManagerId)
    .maybeSingle();
  return (data as { user_id?: string } | null)?.user_id ?? null;
}

export async function resolveCycleManagerUserId(cycleId: string): Promise<string | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("investment_cycles")
    .select("pool_manager_id")
    .eq("id", cycleId)
    .maybeSingle();
  const managerId = (data as { pool_manager_id?: string } | null)?.pool_manager_id;
  if (!managerId) return null;
  return resolvePoolManagerUserId(managerId);
}
