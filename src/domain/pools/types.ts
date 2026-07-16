/**
 * Pool Manager Ecosystem — domain types.
 * The canonical Pool record lives in the `funds` table (fund_id === pool_id).
 */

import type { ReturnTier } from "@/features/investor/types/account";

export type PoolId = string;

export type PoolStatus =
  | "active"
  | "inactive"
  | "closed"
  | "paused"
  | "archived";

export type PoolManagerStatus = "pending" | "approved" | "suspended" | "revoked";

/** Marketplace pool — maps 1:1 to `funds` row. */
export interface Pool {
  id: PoolId;
  name: string;
  slug: string;
  description: string;
  status: PoolStatus;
  isDefault: boolean;
  poolDescription: string;
  tradingPair: string;
  poolDurationDays: number | null;
  minInvestment: number;
  maxInvestment: number | null;
  targetCapital: number;
  currentCapital: number;
  profitTargetPct: number;
  targetInvestors: number;
  returnTiers: ReturnTier[];
  isInviteOnly: boolean;
  cardBackgroundColor: string | null;
  poolManagerId: string | null;
  poolManagerName: string | null;
  poolManagerIconUrl: string | null;
  lifecycleStatus?: string;
  createdAt: string;
}

export interface PoolManager {
  id: string;
  userId: string | null;
  displayName: string;
  iconUrl: string | null;
  bio: string | null;
  status: PoolManagerStatus;
  isPlatformManaged: boolean;
  approvedAt: string | null;
  createdAt: string;
}

/** Investor allocation in a pool — maps to `investor_portfolios`. */
export interface PoolInvestment {
  userId: string;
  poolId: PoolId;
  totalInvested: number;
  currentValue: number;
  ownershipPercentage: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalDeposits: number;
  totalWithdrawals: number;
  availableBalance: number;
  investmentStartDate: string | null;
  investmentMaturityDate: string | null;
  updatedAt: string;
}

export interface PoolWithManager extends Pool {
  manager: PoolManager | null;
}

export interface PoolRoiSnapshot {
  poolId: PoolId;
  dailyRoi: number;
  weeklyRoi: number;
  monthlyRoi: number;
  totalPoolValue: number;
  winRate: number;
  totalClosedTrades: number;
  updatedAt: string;
}

/** Tables used by the ecosystem (single source of truth for services). */
export const POOL_STORAGE = {
  pools: "funds",
  managers: "pool_managers",
  investments: "investor_portfolios",
  trades: "trades",
  transactions: "transactions",
  performance: "performance_snapshots",
  roiStats: "pool_stats",
  dailySnapshots: "daily_fund_snapshots",
} as const;
