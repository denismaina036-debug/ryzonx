import { createAdminClient } from "@/lib/supabase/admin";

/** Approved pool manager profile id for a user, if any. */
export async function getApprovedPoolManagerIdForUser(
  userId: string
): Promise<string | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("pool_managers")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "approved")
    .maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

/** Whether the user controls the given pool manager profile. */
export async function userOwnsPoolManager(
  userId: string,
  poolManagerId: string
): Promise<boolean> {
  const db = createAdminClient();
  const { data } = await db
    .from("pool_managers")
    .select("id")
    .eq("user_id", userId)
    .eq("id", poolManagerId)
    .eq("status", "approved")
    .maybeSingle();
  return Boolean(data);
}
