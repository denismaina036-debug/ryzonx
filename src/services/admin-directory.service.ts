import "server-only";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROFIT_SETTLEMENT_ELIGIBLE_ALLOCATION_STATUSES } from "@/constants/investment-allocation";

export async function readAllAdminRows<T>(load: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const result = await load(from, from + 499);
    if (result.error) throw new Error("Admin directory could not be loaded.");
    rows.push(...result.data ?? []);
    if ((result.data?.length ?? 0) < 500) return rows;
  }
}
type Profile = { id: string; full_name: string; email: string };
type Allocation = { investor_id: string; amount: number; returned_capital_amount: number; currency: string; investment_cycles: { fund_id: string | null; funds: { name: string } | null } | null };
export function groupAdminInvestors(profiles: Profile[], allocations: Allocation[]) {
  return profiles.map(profile => {
    const pools = new Map<string, { fundId: string; name: string; currency: string; capital: number }>();
    for (const allocation of allocations.filter(a => a.investor_id === profile.id)) {
      const cycle = allocation.investment_cycles;
      if (!cycle?.fund_id) throw new Error("Investment pool details unavailable.");
      const capital = Number(allocation.amount) - Number(allocation.returned_capital_amount);
      if (!Number.isFinite(capital) || capital < 0) throw new Error("Investment capital unavailable.");
      if (capital === 0) continue;
      const key = `${cycle.fund_id}:${allocation.currency}`;
      const pool = pools.get(key) ?? { fundId: cycle.fund_id, name: cycle.funds?.name ?? "Pool name unavailable", currency: allocation.currency, capital: 0 };
      pool.capital += capital;
      pools.set(key, pool);
    }
    const totals = new Map<string, number>();
    for (const pool of pools.values()) totals.set(pool.currency, (totals.get(pool.currency) ?? 0) + pool.capital);
    return { profile, pools: [...pools.values()], totals: [...totals].map(([currency, capital]) => ({ currency, capital })) };
  });
}
export type AdminInvestorDirectoryRow = ReturnType<typeof groupAdminInvestors>[number];
export const adminDirectoryService = {
  async investors() {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const [profiles, allocations] = await Promise.all([
      readAllAdminRows((from,to) => db.from("profiles").select("id,full_name,email").eq("role","investor").eq("is_active",true).order("full_name").order("id").range(from,to)),
      readAllAdminRows((from,to) => db.from("investment_allocations").select("investor_id,amount,returned_capital_amount,currency,investment_cycles(fund_id,funds(name))").in("status",PROFIT_SETTLEMENT_ELIGIBLE_ALLOCATION_STATUSES).is("capital_returned_at",null).order("id").range(from,to)),
    ]);
    return groupAdminInvestors(profiles, allocations);
  },
  async managers() {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const [managers, funds] = await Promise.all([
      readAllAdminRows((from,to) => db.from("pool_managers").select("id,display_name,manager_level,status,profiles!pool_managers_user_id_fkey(full_name,email)").eq("status","approved").order("display_name").order("id").range(from,to)),
      readAllAdminRows((from,to) => db.from("funds").select("id,pool_manager_id").not("pool_manager_id","is",null).order("id").range(from,to)),
    ]);
    return managers.map(m => ({ id: m.id, displayName: m.display_name, fullName: m.profiles?.full_name || m.display_name, email: m.profiles?.email ?? "Email unavailable", managerLevel: m.manager_level, status: m.status, poolsManaged: funds.filter(f => f.pool_manager_id === m.id).length }));
  },
};
