import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  resolvePoolManagerPublicLabel,
  resolvePublicManagerName,
  managerRowToIdentity,
} from "@/domain/pool-manager/public-profile";
import {
  DEFAULT_FUND_ID,
  DEFAULT_FUND_NAME,
  DEFAULT_FUND_SLUG,
} from "@/constants/funds";
import { resolvePoolId, isValidPoolId } from "@/lib/pool/resolve-pool-id";
import type { ReturnTier } from "@/features/investor/types/account";
import type {
  Pool,
  PoolInvestment,
  PoolManager,
  PoolRoiSnapshot,
  PoolWithManager,
} from "@/domain/pools/types";

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

type FundRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  is_default: boolean;
  pool_description: string | null;
  trading_pair: string | null;
  pool_duration_days: number | null;
  min_investment: number;
  max_investment: number | null;
  target_capital: number | null;
  current_capital: number | null;
  profit_target_pct: number | null;
  target_investors: number | null;
  return_tiers: ReturnTier[] | null;
  is_invite_only: boolean;
  card_background_color: string | null;
  pool_manager_id: string | null;
  pool_manager_name: string | null;
  pool_manager_icon_url: string | null;
  created_at: string;
};

type ManagerRow = {
  id: string;
  user_id: string | null;
  username?: string | null;
  slug?: string | null;
  display_name: string;
  show_full_name?: boolean | null;
  icon_url: string | null;
  bio: string | null;
  status: string;
  is_platform_managed: boolean;
  approved_at: string | null;
  created_at: string;
};

function mapManager(row: ManagerRow): PoolManager {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: resolvePoolManagerPublicLabel(managerRowToIdentity(row)),
    iconUrl: row.icon_url,
    bio: row.bio,
    status: row.status as PoolManager["status"],
    isPlatformManaged: row.is_platform_managed,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
  };
}

function mapPool(row: FundRow): Pool {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    status: row.status as Pool["status"],
    isDefault: row.is_default,
    poolDescription: row.pool_description ?? row.description ?? "",
    tradingPair: row.trading_pair ?? "Multi-pair",
    poolDurationDays: row.pool_duration_days,
    minInvestment: toNumber(row.min_investment),
    maxInvestment: row.max_investment != null ? toNumber(row.max_investment) : null,
    targetCapital: toNumber(row.target_capital),
    currentCapital: toNumber(row.current_capital),
    profitTargetPct: toNumber(row.profit_target_pct),
    targetInvestors: row.target_investors ?? 0,
    returnTiers: Array.isArray(row.return_tiers) ? row.return_tiers : [],
    isInviteOnly: row.is_invite_only,
    cardBackgroundColor: row.card_background_color,
    poolManagerId: row.pool_manager_id,
    poolManagerName: row.pool_manager_name,
    poolManagerIconUrl: row.pool_manager_icon_url,
    createdAt: row.created_at,
  };
}

async function fetchManager(
  db: ReturnType<typeof createAdminClient>,
  managerId: string | null
): Promise<PoolManager | null> {
  if (!managerId) return null;

  const { data } = await db
    .from("pool_managers")
    .select("*")
    .eq("id", managerId)
    .maybeSingle();

  return data ? mapManager(data as ManagerRow) : null;
}

export const poolEcosystemService = {
  getDefaultPoolId(): string {
    return DEFAULT_FUND_ID;
  },

  resolvePoolId(poolId?: string | null): string {
    return resolvePoolId(poolId);
  },

  async getDefaultPool(): Promise<PoolWithManager> {
    return this.getPoolById(DEFAULT_FUND_ID);
  },

  async getPoolById(poolId: string): Promise<PoolWithManager> {
    const id = resolvePoolId(poolId);
    const db = createAdminClient();

    const { data, error } = await db.from("funds").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Pool not found.");

    const row = data as FundRow;
    const manager = await fetchManager(db, row.pool_manager_id);
    const pool = mapPool(row);

    return {
      ...pool,
      poolManagerName:
        manager?.displayName ?? resolvePublicManagerName(null, row.pool_manager_name),
      manager,
    };
  },

  async getPoolBySlug(slug: string): Promise<PoolWithManager | null> {
    const db = createAdminClient();
    const { data, error } = await db.from("funds").select("*").eq("slug", slug).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;

    const row = data as FundRow;
    const manager = await fetchManager(db, row.pool_manager_id);
    const pool = mapPool(row);

    return {
      ...pool,
      poolManagerName:
        manager != null
          ? manager.displayName
          : resolvePublicManagerName(null, row.pool_manager_name),
      manager,
    };
  },

  async listActivePools(): Promise<PoolWithManager[]> {
    const db = createAdminClient();

    const { data, error } = await db
      .from("funds")
      .select("*")
      .eq("status", "active")
      .order("is_default", { ascending: false })
      .order("name");

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as FundRow[];
    const managerIds = [...new Set(rows.map((r) => r.pool_manager_id).filter(Boolean))] as string[];

    const managersMap = new Map<string, PoolManager>();
    if (managerIds.length > 0) {
      const { data: managers } = await db
        .from("pool_managers")
        .select("*")
        .in("id", managerIds);

      for (const m of (managers ?? []) as ManagerRow[]) {
        managersMap.set(m.id, mapManager(m));
      }
    }

    return rows.map((row) => {
      const manager = row.pool_manager_id ? managersMap.get(row.pool_manager_id) ?? null : null;
      return {
        ...mapPool(row),
        poolManagerName:
          manager?.displayName ?? resolvePublicManagerName(null, row.pool_manager_name),
        manager,
      };
    });
  },

  async assertPoolActive(poolId: string): Promise<Pool> {
    const pool = await this.getPoolById(poolId);
    if (pool.status !== "active") {
      throw new Error("Pool is not available for participation.");
    }
    return pool;
  },

  async getPoolRoi(poolId: string): Promise<PoolRoiSnapshot | null> {
    const id = resolvePoolId(poolId);
    const db = createAdminClient();

    const { data, error } = await db
      .from("pool_stats")
      .select("*")
      .eq("fund_id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    const row = data as {
      fund_id: string;
      daily_roi: number;
      weekly_roi: number;
      monthly_roi: number;
      total_pool_value: number;
      win_rate: number;
      total_closed_trades: number;
      updated_at: string;
    };

    return {
      poolId: row.fund_id,
      dailyRoi: toNumber(row.daily_roi),
      weeklyRoi: toNumber(row.weekly_roi),
      monthlyRoi: toNumber(row.monthly_roi),
      totalPoolValue: toNumber(row.total_pool_value),
      winRate: toNumber(row.win_rate),
      totalClosedTrades: toNumber(row.total_closed_trades),
      updatedAt: row.updated_at,
    };
  },

  async getPoolInvestments(poolId: string): Promise<PoolInvestment[]> {
    if (!isValidPoolId(poolId)) throw new Error("Invalid pool id.");
    const db = createAdminClient();

    const { data, error } = await db
      .from("investor_portfolios")
      .select("*")
      .eq("fund_id", poolId)
      .gt("total_invested", 0);

    if (error) throw new Error(error.message);

    return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      userId: String(row.user_id),
      poolId: String(row.fund_id),
      totalInvested: toNumber(row.total_invested as number),
      currentValue: toNumber(row.current_value as number),
      ownershipPercentage: toNumber(row.ownership_percentage as number),
      unrealizedPnl: toNumber(row.unrealized_pnl as number),
      realizedPnl: toNumber(row.realized_pnl as number),
      totalDeposits: toNumber(row.total_deposits as number),
      totalWithdrawals: toNumber(row.total_withdrawals as number),
      availableBalance: toNumber(row.available_balance as number),
      investmentStartDate: (row.investment_start_date as string | null) ?? null,
      investmentMaturityDate: (row.investment_maturity_date as string | null) ?? null,
      updatedAt: String(row.updated_at),
    }));
  },

  async getApprovedManagers(): Promise<PoolManager[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pool_managers")
      .select("*")
      .eq("status", "approved")
      .order("display_name");

    if (error) throw new Error(error.message);
    return ((data ?? []) as ManagerRow[]).map(mapManager);
  },

  async getArchitectureSummary(): Promise<{
    defaultPoolId: string;
    defaultPoolName: string;
    defaultPoolSlug: string;
    activePoolCount: number;
    approvedManagerCount: number;
  }> {
    const db = createAdminClient();

    const [poolsResult, managersResult] = await Promise.all([
      db.from("funds").select("id", { count: "exact", head: true }).eq("status", "active"),
      db
        .from("pool_managers")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved"),
    ]);

    return {
      defaultPoolId: DEFAULT_FUND_ID,
      defaultPoolName: DEFAULT_FUND_NAME,
      defaultPoolSlug: DEFAULT_FUND_SLUG,
      activePoolCount: poolsResult.count ?? 0,
      approvedManagerCount: managersResult.count ?? 0,
    };
  },
};
