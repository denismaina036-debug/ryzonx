import { createAdminClient } from "@/lib/supabase/admin";
import type {
  LandingInvestmentActivity,
  LandingInvestmentActivityType,
} from "@/domain/landing-page/types";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function anonymizeName(fullName: string | null | undefined): string {
  const trimmed = fullName?.trim();
  if (!trimmed) return "Investor";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return `${parts[0]!.charAt(0).toUpperCase()}.`;
  }
  return `${parts[0]!} ${parts[parts.length - 1]!.charAt(0).toUpperCase()}.`;
}

function activitySubtitle(type: LandingInvestmentActivityType, poolName: string | null): string {
  switch (type) {
    case "pool_join":
      return poolName ? `Joined ${poolName}` : "Joined Pool";
    case "deposit":
      return "Deposit Completed";
    case "withdrawal":
      return "Withdrawal Completed";
    case "investment_confirmed":
      return poolName ? `Investment Confirmed · ${poolName}` : "Investment Confirmed";
    case "pool_settlement":
      return poolName ? `Pool Settlement · ${poolName}` : "Pool Settlement Completed";
    case "profit_distribution":
      return poolName ? `Profit Distribution · ${poolName}` : "Profit Distribution Completed";
    default:
      return "Investment Activity";
  }
}

const INVESTMENT_ACTIVITY_TYPES: LandingInvestmentActivityType[] = [
  "pool_join",
  "deposit",
  "investment_confirmed",
];

const PAYOUT_ACTIVITY_TYPES: LandingInvestmentActivityType[] = [
  "withdrawal",
  "pool_settlement",
  "profit_distribution",
];

async function loadProfileNames(
  db: ReturnType<typeof createAdminClient>,
  userIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (userIds.length === 0) return map;
  const { data } = await db.from("profiles").select("id, full_name").in("id", userIds);
  for (const row of (data ?? []) as Array<{ id: string; full_name: string | null }>) {
    map.set(row.id, anonymizeName(row.full_name));
  }
  return map;
}

async function loadFundNames(
  db: ReturnType<typeof createAdminClient>,
  fundIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (fundIds.length === 0) return map;
  const { data } = await db.from("funds").select("id, name").in("id", fundIds);
  for (const row of (data ?? []) as Array<{ id: string; name: string }>) {
    map.set(row.id, row.name);
  }
  return map;
}

export const landingPageActivityService = {
  async listRecent(limit = 12): Promise<LandingInvestmentActivity[]> {
    const db = createAdminClient();
    const items: LandingInvestmentActivity[] = [];

    const { data: allocations } = await db
      .from("investment_allocations")
      .select("id, amount, created_at, status, investor_id, investment_cycle_id")
      .in("status", ["pending", "funding_confirmed", "confirmed", "settled", "locked", "distributed"])
      .order("created_at", { ascending: false })
      .limit(limit);

    const allocRows = (allocations ?? []) as Array<{
      id: string;
      amount: number;
      created_at: string;
      status: string;
      investor_id: string;
      investment_cycle_id: string;
    }>;

    const cycleIds = [...new Set(allocRows.map((r) => r.investment_cycle_id))];
    const investorIds = [...new Set(allocRows.map((r) => r.investor_id))];

    const [{ data: cycles }, profileNames] = await Promise.all([
      cycleIds.length
        ? db.from("investment_cycles").select("id, name, fund_id").in("id", cycleIds)
        : Promise.resolve({ data: [] }),
      loadProfileNames(db, investorIds),
    ]);

    const cycleMap = new Map(
      ((cycles ?? []) as Array<{ id: string; name: string; fund_id: string }>).map((c) => [c.id, c])
    );
    const fundIds = [...new Set(((cycles ?? []) as Array<{ fund_id: string }>).map((c) => c.fund_id))];
    const fundNames = await loadFundNames(db, fundIds);

    for (const row of allocRows) {
      const cycle = cycleMap.get(row.investment_cycle_id);
      const poolName = cycle ? fundNames.get(cycle.fund_id) ?? cycle.name : null;
      const activityType: LandingInvestmentActivityType =
        row.status === "funding_confirmed" || row.status === "confirmed"
          ? "investment_confirmed"
          : "pool_join";
      items.push({
        id: `alloc-${row.id}`,
        displayName: profileNames.get(row.investor_id) ?? "Investor",
        amount: toNumber(row.amount),
        createdAt: row.created_at,
        activityType,
        poolName,
        subtitle: activitySubtitle(activityType, poolName),
      });
    }

    const { data: transactions } = await db
      .from("transactions")
      .select("id, amount, type, status, created_at, payment_method, fund_id, user_id")
      .eq("is_public", true)
      .in("type", ["deposit", "withdrawal", "adjustment"])
      .in("status", ["approved", "completed"])
      .order("created_at", { ascending: false })
      .limit(limit);

    const txRows = (transactions ?? []) as Array<{
      id: string;
      amount: number;
      type: string;
      created_at: string;
      payment_method: string | null;
      fund_id: string | null;
      user_id: string;
    }>;

    const txUserIds = [...new Set(txRows.map((r) => r.user_id))];
    const txFundIds = [...new Set(txRows.map((r) => r.fund_id).filter(Boolean))] as string[];
    const [txProfileNames, txFundNames] = await Promise.all([
      loadProfileNames(db, txUserIds),
      loadFundNames(db, txFundIds),
    ]);

    for (const row of txRows) {
      const paymentMethod = String(row.payment_method ?? "");
      const poolName = row.fund_id ? txFundNames.get(row.fund_id) ?? null : null;

      let activityType: LandingInvestmentActivityType | null = null;
      if (row.type === "deposit") activityType = "deposit";
      else if (row.type === "withdrawal") activityType = "withdrawal";
      else if (paymentMethod === "pool_allocation") activityType = "pool_join";
      else if (paymentMethod === "pool_exit") activityType = "withdrawal";
      else if (paymentMethod === "profit_transfer" || paymentMethod === "profit_reinvest") {
        activityType = "profit_distribution";
      } else if (paymentMethod.includes("settlement")) {
        activityType = "pool_settlement";
      }
      if (!activityType) continue;

      items.push({
        id: `tx-${row.id}`,
        displayName: txProfileNames.get(row.user_id) ?? "Investor",
        amount: toNumber(row.amount),
        createdAt: row.created_at,
        activityType,
        poolName,
        subtitle: activitySubtitle(activityType, poolName),
      });
    }

    return items
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },

  async listInvestments(limit = 6): Promise<LandingInvestmentActivity[]> {
    const all = await this.listRecent(limit * 3);
    return all.filter((item) => INVESTMENT_ACTIVITY_TYPES.includes(item.activityType)).slice(0, limit);
  },

  async listPayouts(limit = 6): Promise<LandingInvestmentActivity[]> {
    const all = await this.listRecent(limit * 3);
    return all.filter((item) => PAYOUT_ACTIVITY_TYPES.includes(item.activityType)).slice(0, limit);
  },

  async listTicker(limit = 5): Promise<LandingInvestmentActivity[]> {
    return this.listRecent(limit);
  },
};
