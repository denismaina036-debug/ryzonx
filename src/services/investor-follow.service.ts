import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/authorization";
import { requireAuth } from "@/lib/auth/session";

export interface ManagerFollowSummary {
  poolManagerId: string;
  displayName: string;
  slug: string;
  followedAt: string;
}

export const investorFollowService = {
  async follow(poolManagerId: string): Promise<void> {
    const user = await requirePermission("FOLLOW_POOL_MANAGER");
    const db = createAdminClient();

    const { error } = await db.from("investor_manager_follows").upsert(
      {
        investor_id: user.id,
        pool_manager_id: poolManagerId,
      } as never,
      { onConflict: "investor_id,pool_manager_id" }
    );
    if (error) throw new Error(error.message);
  },

  async unfollow(poolManagerId: string): Promise<void> {
    const user = await requirePermission("FOLLOW_POOL_MANAGER");
    const db = createAdminClient();
    const { error } = await db
      .from("investor_manager_follows")
      .delete()
      .eq("investor_id", user.id)
      .eq("pool_manager_id", poolManagerId);
    if (error) throw new Error(error.message);
  },

  async isFollowing(poolManagerId: string, investorId?: string): Promise<boolean> {
    const id = investorId ?? (await requireAuth()).id;
    const db = createAdminClient();
    const { data } = await db
      .from("investor_manager_follows")
      .select("id")
      .eq("investor_id", id)
      .eq("pool_manager_id", poolManagerId)
      .maybeSingle();
    return Boolean(data);
  },

  async listFollowing(investorId?: string): Promise<ManagerFollowSummary[]> {
    const id = investorId ?? (await requireAuth()).id;
    const db = createAdminClient();
    const { data, error } = await db
      .from("investor_manager_follows")
      .select("pool_manager_id, created_at, pool_managers(display_name, slug)")
      .eq("investor_id", id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return ((data ?? []) as Array<{
      pool_manager_id: string;
      created_at: string;
      pool_managers: { display_name: string; slug: string } | null;
    }>).map((row) => ({
      poolManagerId: row.pool_manager_id,
      displayName: row.pool_managers?.display_name ?? "Manager",
      slug: row.pool_managers?.slug ?? "",
      followedAt: row.created_at,
    }));
  },

  async followerCount(poolManagerId: string): Promise<number> {
    const db = createAdminClient();
    const { count, error } = await db
      .from("investor_manager_follows")
      .select("id", { count: "exact", head: true })
      .eq("pool_manager_id", poolManagerId);
    if (error) throw new Error(error.message);
    return count ?? 0;
  },
};
