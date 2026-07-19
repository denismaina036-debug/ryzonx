import { createAdminClient } from "@/lib/supabase/admin";

/** Cycle statuses that lock pool configuration while active. */
export const POOL_LOCKING_CYCLE_STATUSES = [
  "approved",
  "funding",
  "trading",
  "distribution",
] as const;

export const poolGovernanceLockService = {
  async hasActiveCycleForFund(fundId: string): Promise<boolean> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("investment_cycles")
      .select("id")
      .eq("fund_id", fundId)
      .in("status", [...POOL_LOCKING_CYCLE_STATUSES])
      .limit(1);
    if (error) throw new Error(error.message);
    return (data ?? []).length > 0;
  },

  async assertPoolEditable(fundId: string): Promise<void> {
    const locked = await this.hasActiveCycleForFund(fundId);
    if (locked) {
      throw new Error(
        "Pool configuration is locked while an investment cycle is active. " +
          "Changes are permitted after all active cycles complete."
      );
    }
  },

  async isStrategyLockedByActiveCycle(strategyId: string): Promise<boolean> {
    const db = createAdminClient();
    const { data: funds } = await db.from("funds").select("id, pool_faq");
    const fundIds = ((funds ?? []) as Array<{ id: string; pool_faq: unknown }>)
      .filter((f) => {
        const faq = f.pool_faq as { managedPool?: { strategyId?: string; internalStrategyId?: string } };
        const sid = faq?.managedPool?.strategyId ?? faq?.managedPool?.internalStrategyId;
        return sid === strategyId;
      })
      .map((f) => f.id);

    if (fundIds.length === 0) return false;

    const { data: cycles } = await db
      .from("investment_cycles")
      .select("id")
      .in("fund_id", fundIds)
      .in("status", [...POOL_LOCKING_CYCLE_STATUSES])
      .limit(1);

    return (cycles ?? []).length > 0;
  },
};
