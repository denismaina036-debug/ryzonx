import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { userOwnsPoolManager } from "@/lib/auth/pool-manager-access";
import { USER_ROLES } from "@/constants/roles";
import {
  FINANCIAL_AUDIT_PROFIT_ACTIONS,
  type ProfitSettlementStatus,
} from "@/constants/profit-distribution";
import { generateLedgerReference } from "@/lib/financial/ledger-utils";
import { computeCycleRealizedTradingProfit } from "@/lib/financial/profit-distribution-calculator";
import {
  calculateRoiV2Distribution,
  calculateOwnershipOnlyDistribution,
  type RoiV2AllocationInput,
} from "@/lib/financial/roi-v2-distribution";
import { poolRoiService } from "@/services/pool-roi.service";
import { platformSettingsService } from "@/services/platform-settings.service";
import { auditService } from "@/services/audit.service";
import { PROFIT_SETTLEMENT_ELIGIBLE_ALLOCATION_STATUSES } from "@/constants/investment-allocation";
import { COMMITTED_ALLOCATION_STATUSES } from "@/domain/investment/cycle-metrics";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { investmentAllocationService } from "@/services/investment-allocation.service";
import { tradeEntryService } from "@/services/trade-entry.service";
import { cycleProfitService } from "@/services/investment-engine/cycle-profit.service";
import { cycleOwnershipService } from "@/services/investment-engine/cycle-ownership.service";
import { investorProfitWalletService } from "@/services/investment-engine/investor-profit-wallet.service";
import { cycleLifecycleOrchestrator } from "@/services/investment-engine/cycle-lifecycle-orchestrator.service";
import { ledgerService } from "@/services/ledger.service";
import { ledgerAccountService } from "@/services/ledger-account.service";
import { attachTransactionReference } from "@/lib/transaction/insert";
import { publishPlatformEvent, PLATFORM_EVENT_TYPES } from "@/lib/platform-events/publish";
import type {
  ProfitSettlement,
  ProfitSettlementAllocation,
  PlatformRevenueSummary,
  PoolManagerFinancialDashboard,
} from "@/domain/financial/types";

type SettlementRow = {
  id: string;
  investment_cycle_id: string;
  fund_id: string | null;
  pool_manager_id: string;
  cycle_capital: string | number;
  gross_trading_profit: string | number;
  platform_service_fee_pct: string | number;
  platform_service_fee: string | number;
  net_distributable_profit: string | number;
  investor_share_pct: string | number;
  pool_manager_share_pct: string | number;
  investor_distribution_total: string | number;
  pool_manager_earnings: string | number;
  status: ProfitSettlementStatus;
  settlement_date: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  distributed_at: string | null;
  settlement_ledger_transaction_id: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
};

type AllocationRow = {
  id: string;
  profit_settlement_id: string;
  investment_allocation_id: string;
  investor_id: string;
  capital_basis: string | number;
  ownership_pct: string | number;
  profit_share: string | number;
  status: string;
  ledger_transaction_id: string | null;
  transferred_at: string | null;
  created_at: string;
  updated_at: string;
};

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function mapSettlement(row: SettlementRow): ProfitSettlement {
  return {
    id: row.id,
    investmentCycleId: row.investment_cycle_id,
    fundId: row.fund_id,
    poolManagerId: row.pool_manager_id,
    cycleCapital: toNumber(row.cycle_capital),
    grossTradingProfit: toNumber(row.gross_trading_profit),
    platformServiceFeePct: toNumber(row.platform_service_fee_pct),
    platformServiceFee: toNumber(row.platform_service_fee),
    netDistributableProfit: toNumber(row.net_distributable_profit),
    investorSharePct: toNumber(row.investor_share_pct),
    poolManagerSharePct: toNumber(row.pool_manager_share_pct),
    investorDistributionTotal: toNumber(row.investor_distribution_total),
    poolManagerEarnings: toNumber(row.pool_manager_earnings),
    status: row.status,
    settlementDate: row.settlement_date,
    confirmedAt: row.confirmed_at,
    confirmedBy: row.confirmed_by,
    distributedAt: row.distributed_at,
    settlementLedgerTransactionId: row.settlement_ledger_transaction_id,
    currency: row.currency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAllocation(row: AllocationRow): ProfitSettlementAllocation {
  return {
    id: row.id,
    profitSettlementId: row.profit_settlement_id,
    investmentAllocationId: row.investment_allocation_id,
    investorId: row.investor_id,
    capitalBasis: toNumber(row.capital_basis),
    ownershipPct: toNumber(row.ownership_pct),
    profitShare: toNumber(row.profit_share),
    status: row.status,
    ledgerTransactionId: row.ledger_transaction_id,
    transferredAt: row.transferred_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function readPoolRoiConfig(fundId: string | null): Promise<{
  multipliers: Map<string, number>;
}> {
  if (!fundId) return { multipliers: new Map() };
  const rows = await poolRoiService.getMultipliersForFund(fundId);
  return {
    multipliers: new Map(rows.map((r) => [r.investmentLevelId, r.multiplier])),
  };
}

async function readInvestorFundInvested(investorId: string, fundId: string): Promise<number> {
  const db = createAdminClient();
  const { data: portfolio } = await db
    .from("investor_portfolios")
    .select("total_invested")
    .eq("user_id", investorId)
    .eq("fund_id", fundId)
    .maybeSingle();
  if (portfolio) {
    return toNumber((portfolio as { total_invested: number | string }).total_invested);
  }

  const { data: cycles } = await db
    .from("investment_cycles")
    .select("id")
    .eq("fund_id", fundId);
  const cycleIds = ((cycles ?? []) as Array<{ id: string }>).map((row) => row.id);
  if (cycleIds.length === 0) return 0;

  const { data: allocations } = await db
    .from("investment_allocations")
    .select("amount")
    .eq("investor_id", investorId)
    .in("investment_cycle_id", cycleIds)
    .in("status", COMMITTED_ALLOCATION_STATUSES.filter((status) => status !== "pending"));

  return ((allocations ?? []) as Array<{ amount: number | string }>).reduce(
    (sum, row) => sum + toNumber(row.amount),
    0
  );
}

async function syncInvestorPortfolioAfterProfitCredit(
  investorId: string,
  fundId: string,
  profitBalance: number
): Promise<void> {
  const db = createAdminClient();
  const invested = await readInvestorFundInvested(investorId, fundId);
  const currentValue = roundMoney(invested + profitBalance);

  const { data: portfolio } = await db
    .from("investor_portfolios")
    .select("total_invested")
    .eq("user_id", investorId)
    .eq("fund_id", fundId)
    .maybeSingle();

  if (!portfolio) {
    await db.from("investor_portfolios").insert({
      user_id: investorId,
      fund_id: fundId,
      total_invested: invested,
      current_value: currentValue,
      available_balance: 0,
      realized_pnl: 0,
      unrealized_pnl: 0,
    } as never);
    return;
  }

  await db
    .from("investor_portfolios")
    .update({
      current_value: currentValue,
      realized_pnl: 0,
      unrealized_pnl: 0,
    } as never)
    .eq("user_id", investorId)
    .eq("fund_id", fundId);
}

async function recordInvestorCycleProfitActivity(input: {
  investorId: string;
  fundId: string;
  poolName: string;
  cycleId: string;
  cycleName: string;
  settlementId: string;
  allocationId: string;
  amount: number;
}): Promise<void> {
  if (input.amount <= 0) return;

  const db = createAdminClient();
  const notes = `Profit — ${input.poolName}`;
  const { data: tx, error } = await db
    .from("transactions")
    .insert({
      user_id: input.investorId,
      fund_id: input.fundId,
      type: "adjustment",
      amount: input.amount,
      status: "completed",
      payment_method: "cycle_profit",
      notes,
      metadata: {
        cycleId: input.cycleId,
        cycleName: input.cycleName,
        settlementId: input.settlementId,
        allocationId: input.allocationId,
      },
    } as never)
    .select("id")
    .single();

  if (error || !tx) throw new Error(error?.message ?? "Failed to record investor profit activity.");
  await attachTransactionReference(db, (tx as { id: string }).id, {
    type: "adjustment",
    payment_method: "cycle_profit",
    notes,
  });
}

async function readPoolName(fundId: string): Promise<string> {
  const db = createAdminClient();
  const { data } = await db.from("funds").select("name").eq("id", fundId).maybeSingle();
  return (data as { name?: string } | null)?.name ?? "Pool";
}

async function resolveCycleGrossTradingProfit(
  cycleId: string,
  options?: { grossTradingProfitOverride?: number }
): Promise<number> {
  if (options?.grossTradingProfitOverride != null) {
    return options.grossTradingProfitOverride;
  }
  const tradeEntries = await tradeEntryService.listByCycleInternal(cycleId);
  const journalProfit = computeCycleRealizedTradingProfit(tradeEntries);
  const cachedCycleProfit = await cycleProfitService.getCycleProfit(cycleId);
  return cachedCycleProfit !== 0 ? cachedCycleProfit : journalProfit;
}

async function listSettlementEligibleAllocations(cycleId: string) {
  const allocations = await investmentAllocationService.listByCycleInternal(cycleId);
  return allocations.filter((a) =>
    PROFIT_SETTLEMENT_ELIGIBLE_ALLOCATION_STATUSES.includes(a.status)
  );
}

export const profitDistributionService = {
  async hasInvestorAllocationsForSettlement(cycleId: string): Promise<boolean> {
    const settled = await listSettlementEligibleAllocations(cycleId);
    return settled.length > 0;
  },

  async getCycleGrossTradingProfit(
    cycleId: string,
    options?: { grossTradingProfitOverride?: number }
  ): Promise<number> {
    return resolveCycleGrossTradingProfit(cycleId, options);
  },
  async getByCycleId(cycleId: string): Promise<ProfitSettlement | null> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("profit_settlements")
      .select("*")
      .eq("investment_cycle_id", cycleId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapSettlement(data as SettlementRow) : null;
  },

  async listAllocations(settlementId: string): Promise<ProfitSettlementAllocation[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("profit_settlement_allocations")
      .select("*")
      .eq("profit_settlement_id", settlementId)
      .order("profit_share", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as AllocationRow[]).map(mapAllocation);
  },

  /**
   * Central Profit Distribution Engine — calculates settlement from journal PnL,
   * pool profit-sharing agreement, and Return Structure Distribution.
   * Sequence: Gross → Fee → Net → PM Share → Investor Pool → Return Structure.
   */
  async calculateSettlementForCycle(
    cycleId: string,
    actorId: string,
    options?: { grossTradingProfitOverride?: number }
  ): Promise<ProfitSettlement> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    return this.initiateSettlementForCycle(cycleId, actorId, options);
  },

  /** PM or admin — calculates settlement when a cycle enters distribution. */
  async initiateSettlementForCycle(
    cycleId: string,
    actorId: string,
    options?: { grossTradingProfitOverride?: number }
  ): Promise<ProfitSettlement> {
    const cycle = await investmentCycleService.getById(cycleId);
    if (!cycle) throw new Error("Cycle not found.");
    if (cycle.status !== "trading" && cycle.status !== "distribution") {
      throw new Error("Profit settlement requires an active trading cycle.");
    }

    const existing = await this.getByCycleId(cycleId);
    if (existing && !["calculated", "pending_review", "cancelled"].includes(existing.status)) {
      throw new Error("Settlement already confirmed for this cycle.");
    }

    const settled = await listSettlementEligibleAllocations(cycleId);
    if (settled.length === 0) {
      return this.initiatePoolManagerOnlySettlement(cycleId, cycle, actorId, existing, options);
    }

    const grossTradingProfit = await resolveCycleGrossTradingProfit(cycleId, options);

    const snapshots = await cycleOwnershipService.getSnapshot(cycleId);
    const useOwnershipSnapshots = snapshots.length > 0;

    const roiConfig = await readPoolRoiConfig(cycle.fundId);
    const hasRoiMultipliers = roiConfig.multipliers.size > 0;
    const cycleCapital = useOwnershipSnapshots
      ? snapshots[0]!.poolCapitalTotal
      : settled.reduce((s, a) => s + a.amount, 0);
    const platformFeeRate = await platformSettingsService.getPlatformServiceFeeRate();

    const db = createAdminClient();
    const { data: allocationRows } = await db
      .from("investment_allocations")
      .select(
        "id, investor_id, amount, investment_level_id, roi_multiplier, cumulative_realised_return, target_fulfilled"
      )
      .eq("investment_cycle_id", cycleId)
      .in(
        "id",
        settled.map((a) => a.id)
      );

    const roiRowMap = new Map(
      ((allocationRows ?? []) as Array<{
        id: string;
        investor_id: string;
        amount: number;
        investment_level_id: string | null;
        roi_multiplier: number | null;
        cumulative_realised_return: number | null;
        target_fulfilled: boolean | null;
      }>).map((row) => [row.id, row])
    );

    const allocationInput: RoiV2AllocationInput[] = settled.map((a) => {
      const row = roiRowMap.get(a.id);
      const snapshot = useOwnershipSnapshots
        ? snapshots.find((s) => !s.isVirtual && s.investorId === a.investorId)
        : null;
      const capitalBasis = snapshot?.capital ?? a.amount;
      const levelId = row?.investment_level_id ?? null;
      const multiplier =
        row?.roi_multiplier != null
          ? toNumber(row.roi_multiplier)
          : levelId && hasRoiMultipliers
            ? roiConfig.multipliers.get(levelId) ?? 2.0
            : hasRoiMultipliers
              ? 2.0
              : 1.0;
      return {
        allocationId: a.id,
        investorId: a.investorId,
        capitalBasis,
        roiMultiplier: multiplier,
        cumulativeRealisedReturn: toNumber(row?.cumulative_realised_return),
        targetFulfilled: Boolean(row?.target_fulfilled),
        investmentLevelId: levelId,
      };
    });

    const breakdown = hasRoiMultipliers
      ? calculateRoiV2Distribution({
          grossTradingProfit,
          platformServiceFeeRate: platformFeeRate,
          allocations: allocationInput,
        })
      : calculateOwnershipOnlyDistribution({
          grossTradingProfit,
          platformServiceFeeRate: platformFeeRate,
          allocations: allocationInput.map((a) => {
            const snapshot = useOwnershipSnapshots
              ? snapshots.find((s) => !s.isVirtual && s.investorId === a.investorId)
              : null;
            const totalCapital =
              cycleCapital > 0
                ? cycleCapital
                : allocationInput.reduce((s, x) => s + x.capitalBasis, 0);
            const ownershipPct = snapshot
              ? snapshot.ownershipPct / 100
              : totalCapital > 0
                ? a.capitalBasis / totalCapital
                : 0;
            return {
              allocationId: a.allocationId,
              investorId: a.investorId,
              capitalBasis: a.capitalBasis,
              ownershipPct,
            };
          }),
        });

    if (useOwnershipSnapshots && grossTradingProfit > 0) {
      const netAfterFee = roundMoney(grossTradingProfit * (1 - platformFeeRate));
      const virtualShare = snapshots
        .filter((s) => s.isVirtual)
        .reduce((sum, s) => sum + roundMoney(netAfterFee * (s.ownershipPct / 100)), 0);
      if (virtualShare > 0) {
        breakdown.poolManagerEarnings = roundMoney(breakdown.poolManagerEarnings + virtualShare);
        breakdown.poolManagerSurplus = roundMoney(
          (breakdown.poolManagerSurplus ?? 0) + virtualShare
        );
      }
    }

    const settlementPayload = {
      investment_cycle_id: cycleId,
      fund_id: cycle.fundId,
      pool_manager_id: cycle.poolManagerId,
      cycle_capital: cycleCapital,
      gross_trading_profit: breakdown.grossTradingProfit,
      platform_service_fee_pct: breakdown.platformServiceFeePct,
      platform_service_fee: breakdown.platformServiceFee,
      net_distributable_profit: breakdown.netDistributableProfit,
      investor_share_pct: breakdown.investorSharePct,
      pool_manager_share_pct: breakdown.poolManagerSharePct,
      investor_distribution_total: breakdown.investorProfitPool,
      pool_manager_earnings: breakdown.poolManagerEarnings,
      status: "pending_review" as ProfitSettlementStatus,
      settlement_date: new Date().toISOString(),
      currency: "USD",
      metadata: {
        engine: "roi_v2",
        settlementSequence: [
          "gross_trading_profit",
          "platform_service_fee",
          "proportional_capital_distribution",
          "target_tracking",
          "pool_manager_surplus",
        ],
        poolManagerSurplus: breakdown.poolManagerSurplus,
        investorProfitPool: breakdown.investorProfitPool,
      },
    };

    let settlement: ProfitSettlement;
    if (existing) {
      const { data, error } = await db
        .from("profit_settlements")
        .update(settlementPayload as never)
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      settlement = mapSettlement(data as SettlementRow);
      await db
        .from("profit_settlement_allocations")
        .delete()
        .eq("profit_settlement_id", settlement.id);
    } else {
      const { data, error } = await db
        .from("profit_settlements")
        .insert(settlementPayload as never)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      settlement = mapSettlement(data as SettlementRow);
    }

    for (const alloc of breakdown.investorAllocations) {
      const { error } = await db.from("profit_settlement_allocations").insert({
        profit_settlement_id: settlement.id,
        investment_allocation_id: alloc.allocationId,
        investor_id: alloc.investorId,
        capital_basis: alloc.capitalBasis,
        ownership_pct: alloc.ownershipPct,
        profit_share: alloc.profitShare,
        status: "pending",
      } as never);
      if (error) throw new Error(error.message);
    }

    for (const update of breakdown.allocationUpdates) {
      await db
        .from("investment_allocations")
        .update({
          cumulative_realised_return: update.cumulativeRealisedReturn,
          target_fulfilled: update.targetFulfilled,
        } as never)
        .eq("id", update.allocationId);
    }

    await auditService.log({
      actorId,
      action: FINANCIAL_AUDIT_PROFIT_ACTIONS.SETTLEMENT_CALCULATED,
      entityType: "profit_settlement",
      entityId: settlement.id,
      newValues: {
        grossTradingProfit: breakdown.grossTradingProfit,
        platformServiceFee: breakdown.platformServiceFee,
        netDistributableProfit: breakdown.netDistributableProfit,
        poolManagerEarnings: breakdown.poolManagerEarnings,
        investorProfitPool: breakdown.investorProfitPool,
      },
    });

    publishPlatformEvent({
      eventType: PLATFORM_EVENT_TYPES.CYCLE_STATUS_CHANGED,
      category: "financial",
      entityType: "profit_settlement",
      entityId: settlement.id,
      actorId,
      payload: {
        cycleId,
        cycleName: cycle.name,
        summary: `Profit settlement calculated for ${cycle.name}`,
      },
    });

    return settlement;
  },

  /** When a cycle has trading profit but no investor allocations, pay net profit to the pool manager. */
  async initiatePoolManagerOnlySettlement(
    cycleId: string,
    cycle: NonNullable<Awaited<ReturnType<typeof investmentCycleService.getById>>>,
    actorId: string,
    existing: ProfitSettlement | null,
    options?: { grossTradingProfitOverride?: number }
  ): Promise<ProfitSettlement> {
    const grossTradingProfit = await resolveCycleGrossTradingProfit(cycleId, options);
    if (grossTradingProfit <= 0) {
      throw new Error("No trading profit to distribute for this cycle.");
    }

    const snapshots = await cycleOwnershipService.getSnapshot(cycleId);
    const cycleCapital =
      snapshots.length > 0
        ? snapshots[0]!.poolCapitalTotal
        : roundMoney(cycle.raisedCapital ?? 0);

    const platformFeeRate = await platformSettingsService.getPlatformServiceFeeRate();
    const platformServiceFee = roundMoney(grossTradingProfit * platformFeeRate);
    const netDistributableProfit = roundMoney(grossTradingProfit - platformServiceFee);
    const poolManagerEarnings = netDistributableProfit;

    const db = createAdminClient();
    const settlementPayload = {
      investment_cycle_id: cycleId,
      fund_id: cycle.fundId,
      pool_manager_id: cycle.poolManagerId,
      cycle_capital: cycleCapital,
      gross_trading_profit: grossTradingProfit,
      platform_service_fee_pct: platformFeeRate,
      platform_service_fee: platformServiceFee,
      net_distributable_profit: netDistributableProfit,
      investor_share_pct: 0,
      pool_manager_share_pct: 100,
      investor_distribution_total: 0,
      pool_manager_earnings: poolManagerEarnings,
      status: "pending_review" as ProfitSettlementStatus,
      settlement_date: new Date().toISOString(),
      currency: "USD",
      metadata: {
        engine: "pool_manager_only",
        noInvestors: true,
        settlementSequence: [
          "gross_trading_profit",
          "platform_service_fee",
          "pool_manager_full_share",
        ],
      },
    };

    let settlement: ProfitSettlement;
    if (existing) {
      const { data, error } = await db
        .from("profit_settlements")
        .update(settlementPayload as never)
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      settlement = mapSettlement(data as SettlementRow);
      await db
        .from("profit_settlement_allocations")
        .delete()
        .eq("profit_settlement_id", settlement.id);
    } else {
      const { data, error } = await db
        .from("profit_settlements")
        .insert(settlementPayload as never)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      settlement = mapSettlement(data as SettlementRow);
    }

    await auditService.log({
      actorId,
      action: FINANCIAL_AUDIT_PROFIT_ACTIONS.SETTLEMENT_CALCULATED,
      entityType: "profit_settlement",
      entityId: settlement.id,
      newValues: {
        grossTradingProfit,
        platformServiceFee,
        netDistributableProfit,
        poolManagerEarnings,
        investorProfitPool: 0,
        poolManagerOnly: true,
      },
    });

    publishPlatformEvent({
      eventType: PLATFORM_EVENT_TYPES.CYCLE_STATUS_CHANGED,
      category: "financial",
      entityType: "profit_settlement",
      entityId: settlement.id,
      actorId,
      payload: {
        cycleId,
        cycleName: cycle.name,
        summary: `Pool manager profit settlement calculated for ${cycle.name}`,
      },
    });

    return settlement;
  },

  /**
   * Calculate, confirm, and pay out cycle profits without closing the cycle.
   * The cycle remains in trading (or distribution for legacy cycles) after payout.
   */
  async finalizeCycleProfits(cycleId: string, actorId: string): Promise<ProfitSettlement> {
    const cycle = await investmentCycleService.getById(cycleId);
    if (!cycle) throw new Error("Cycle not found.");
    const poolManagerId = cycle.poolManagerId;

    if (cycle.status === "completed") {
      const done = await this.getByCycleId(cycleId);
      if (done) return done;
    }

    if (cycle.status !== "trading" && cycle.status !== "distribution") {
      throw new Error("Cycle must be in trading before profits can be paid out.");
    }

    let settlement = await this.getByCycleId(cycleId);
    if (settlement && settlement.poolManagerId !== poolManagerId) {
      const db = createAdminClient();
      await db
        .from("profit_settlements")
        .update({ pool_manager_id: poolManagerId } as never)
        .eq("id", settlement.id);
      settlement = { ...settlement, poolManagerId };
    }

    if (!settlement || ["calculated", "pending_review", "cancelled"].includes(settlement.status)) {
      settlement = await this.initiateSettlementForCycle(cycleId, actorId);
    }

    if (settlement.status === "pending_review") {
      settlement = await this.confirmSettlementInternal(settlement.id, actorId, poolManagerId);
    }

    if (settlement.status === "confirmed" || settlement.status === "distributing") {
      settlement = await this.distributeEarningsInternal(settlement.id, actorId, poolManagerId);
    }

    return settlement;
  },

  /** Pool Manager confirms settlement — posts fee + PM earnings to ledger. */
  async confirmSettlement(settlementId: string, actorId: string): Promise<ProfitSettlement> {
    const user = await requireAuth();
    const db = createAdminClient();

    const { data: row, error: fetchError } = await db
      .from("profit_settlements")
      .select("*")
      .eq("id", settlementId)
      .single();
    if (fetchError || !row) throw new Error("Settlement not found.");
    const settlement = mapSettlement(row as SettlementRow);

    const isAdmin = user.role === USER_ROLES.ADMINISTRATOR;
    if (!isAdmin && !(await userOwnsPoolManager(user.id, settlement.poolManagerId))) {
      throw new Error("Insufficient permissions");
    }

    return this.confirmSettlementInternal(settlementId, actorId, settlement.poolManagerId);
  },

  async confirmSettlementInternal(
    settlementId: string,
    actorId: string,
    poolManagerId: string
  ): Promise<ProfitSettlement> {
    const db = createAdminClient();

    const { data: row, error: fetchError } = await db
      .from("profit_settlements")
      .select("*")
      .eq("id", settlementId)
      .single();
    if (fetchError || !row) throw new Error("Settlement not found.");
    const settlement = mapSettlement(row as SettlementRow);

    if (settlement.poolManagerId !== poolManagerId) {
      throw new Error("Insufficient permissions");
    }

    if (settlement.status !== "pending_review") {
      throw new Error("Settlement is not awaiting review.");
    }

    const cycle = await investmentCycleService.getById(settlement.investmentCycleId);
    if (!cycle) throw new Error("Cycle not found.");

    const cycleAccounts = await ledgerAccountService.ensureCycleAccounts(cycle.id, cycle.name);
    const pmAccounts = await ledgerAccountService.ensurePoolManagerAccounts(settlement.poolManagerId);
    const platformRevenue = await ledgerAccountService.ensurePlatformRevenueAccount();
    const profitPayable = await ledgerAccountService.ensureCycleProfitPayableAccount(
      cycle.id,
      cycle.name
    );

    const entries: Array<{
      accountId: string;
      entrySide: "debit" | "credit";
      amount: number;
      memo: string;
    }> = [];

    const totalDebit =
      settlement.platformServiceFee +
      settlement.poolManagerEarnings +
      settlement.investorDistributionTotal;

    if (totalDebit > 0) {
      entries.push({
        accountId: cycleAccounts.escrow.id,
        entrySide: "debit",
        amount: totalDebit,
        memo: "Profit settlement recognition",
      });
    }

    if (settlement.platformServiceFee > 0) {
      entries.push({
        accountId: platformRevenue.id,
        entrySide: "credit",
        amount: settlement.platformServiceFee,
        memo: "RyvonX platform service fee (2.5%)",
      });
    }
    if (settlement.poolManagerEarnings > 0) {
      entries.push({
        accountId: pmAccounts.available.id,
        entrySide: "credit",
        amount: settlement.poolManagerEarnings,
        memo: "Pool Manager profit share",
      });
    }
    if (settlement.investorDistributionTotal > 0) {
      entries.push({
        accountId: profitPayable.id,
        entrySide: "credit",
        amount: settlement.investorDistributionTotal,
        memo: "Investor profit payable",
      });
    }

    let ledgerTransactionId: string | null = null;
    if (entries.length > 0) {
      const { transaction } = await ledgerService.postTransaction({
        reference: generateLedgerReference("PST"),
        description: `Profit settlement — ${cycle.name}`,
        transactionType: "profit_settlement",
        sourceType: "profit_settlement",
        sourceId: settlementId,
        actorId,
        metadata: {
          grossTradingProfit: settlement.grossTradingProfit,
          platformServiceFee: settlement.platformServiceFee,
          netDistributableProfit: settlement.netDistributableProfit,
        },
        entries,
      });
      ledgerTransactionId = transaction.id;

      if (settlement.platformServiceFee > 0) {
        await db.from("platform_revenue_entries").insert({
          profit_settlement_id: settlementId,
          investment_cycle_id: settlement.investmentCycleId,
          fund_id: settlement.fundId,
          pool_manager_id: settlement.poolManagerId,
          amount: settlement.platformServiceFee,
          currency: settlement.currency,
          ledger_transaction_id: transaction.id,
        } as never);
      }
    }

    const { data: updated, error } = await db
      .from("profit_settlements")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        confirmed_by: actorId,
        settlement_ledger_transaction_id: ledgerTransactionId,
      } as never)
      .eq("id", settlementId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await auditService.log({
      actorId,
      action: FINANCIAL_AUDIT_PROFIT_ACTIONS.SETTLEMENT_CONFIRMED,
      entityType: "profit_settlement",
      entityId: settlementId,
      newValues: { ledgerTransactionId },
    });

    return mapSettlement(updated as SettlementRow);
  },

  /** Pool Manager executes investor profit transfers after confirming settlement. */
  async distributeEarnings(settlementId: string, actorId: string): Promise<ProfitSettlement> {
    const user = await requireAuth();
    const db = createAdminClient();

    const { data: row } = await db
      .from("profit_settlements")
      .select("*")
      .eq("id", settlementId)
      .single();
    if (!row) throw new Error("Settlement not found.");
    const settlement = mapSettlement(row as SettlementRow);

    const isAdmin = user.role === USER_ROLES.ADMINISTRATOR;
    if (!isAdmin && !(await userOwnsPoolManager(user.id, settlement.poolManagerId))) {
      throw new Error("Insufficient permissions");
    }

    return this.distributeEarningsInternal(settlementId, actorId, settlement.poolManagerId);
  },

  async distributeEarningsInternal(
    settlementId: string,
    actorId: string,
    poolManagerId: string
  ): Promise<ProfitSettlement> {
    const db = createAdminClient();

    const { data: row } = await db
      .from("profit_settlements")
      .select("*")
      .eq("id", settlementId)
      .single();
    if (!row) throw new Error("Settlement not found.");
    const settlement = mapSettlement(row as SettlementRow);

    if (settlement.poolManagerId !== poolManagerId) {
      throw new Error("Insufficient permissions");
    }

    if (settlement.status !== "confirmed" && settlement.status !== "distributing") {
      throw new Error("Settlement must be confirmed before distributing earnings.");
    }

    await db
      .from("profit_settlements")
      .update({ status: "distributing" } as never)
      .eq("id", settlementId);

    const cycle = await investmentCycleService.getById(settlement.investmentCycleId);
    if (!cycle) throw new Error("Cycle not found.");

    const profitPayable = await ledgerAccountService.ensureCycleProfitPayableAccount(
      cycle.id,
      cycle.name
    );

    const pending = await this.listAllocations(settlementId);
    const toTransfer = pending.filter((a) => a.status === "pending" && a.profitShare > 0);
    const poolName =
      settlement.fundId != null ? await readPoolName(settlement.fundId) : cycle.name;

    for (const alloc of toTransfer) {
      if (settlement.fundId) {
        const wallet = await investorProfitWalletService.credit(
          alloc.investorId,
          settlement.fundId,
          alloc.profitShare,
          cycle.id
        );

        const poolProfitAccount = await ledgerAccountService.ensureInvestorPoolProfitAccount(
          alloc.investorId,
          settlement.fundId,
          poolName
        );

        const { transaction } = await ledgerService.postTransaction({
          description: `Cycle profit credited to pool wallet — ${cycle.name}`,
          transactionType: "profit_distribution",
          sourceType: "profit_settlement_allocation",
          sourceId: alloc.id,
          actorId,
          metadata: {
            cycleId: cycle.id,
            cycleName: cycle.name,
            settlementId,
            investorId: alloc.investorId,
            fundId: settlement.fundId,
          },
          entries: [
            {
              accountId: profitPayable.id,
              entrySide: "debit",
              amount: alloc.profitShare,
              memo: "Investor profit payable release",
            },
            {
              accountId: poolProfitAccount.id,
              entrySide: "credit",
              amount: alloc.profitShare,
              memo: "Pool profit held for investor",
            },
          ],
        });

        await syncInvestorPortfolioAfterProfitCredit(
          alloc.investorId,
          settlement.fundId,
          wallet.balance
        );

        await recordInvestorCycleProfitActivity({
          investorId: alloc.investorId,
          fundId: settlement.fundId,
          poolName,
          cycleId: cycle.id,
          cycleName: cycle.name,
          settlementId,
          allocationId: alloc.id,
          amount: alloc.profitShare,
        });

        await db
          .from("profit_settlement_allocations")
          .update({
            status: "transferred",
            ledger_transaction_id: transaction.id,
            transferred_at: new Date().toISOString(),
          } as never)
          .eq("id", alloc.id);

        await auditService.log({
          actorId,
          action: FINANCIAL_AUDIT_PROFIT_ACTIONS.INVESTOR_PROFIT_TRANSFERRED,
          entityType: "profit_settlement_allocation",
          entityId: alloc.id,
          newValues: { amount: alloc.profitShare, ledgerTransactionId: transaction.id },
        });
        continue;
      }

      throw new Error("Settlement fund is required to credit investor pool profit.");
    }

    const { data: completed, error } = await db
      .from("profit_settlements")
      .update({
        status: "completed",
        distributed_at: new Date().toISOString(),
      } as never)
      .eq("id", settlementId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await auditService.log({
      actorId,
      action: FINANCIAL_AUDIT_PROFIT_ACTIONS.SETTLEMENT_DISTRIBUTED,
      entityType: "profit_settlement",
      entityId: settlementId,
    });

    try {
      await cycleLifecycleOrchestrator.onSettlementDistributed(
        settlement.investmentCycleId,
        actorId
      );
    } catch {
      /* queue processing / next cycle should not block distribution record */
    }

    return mapSettlement(completed as SettlementRow);
  },

  /** Backfill investor activity rows for settlements that predated cycle_profit logging. */
  async backfillInvestorCycleProfitActivities(investorId: string): Promise<void> {
    const db = createAdminClient();
    const { data: allocations, error } = await db
      .from("profit_settlement_allocations")
      .select("id, investor_id, profit_share, profit_settlement_id")
      .eq("investor_id", investorId)
      .eq("status", "transferred")
      .gt("profit_share", 0);

    if (error) throw new Error(error.message);
    if (!allocations?.length) return;

    const settlementIds = [
      ...new Set(
        (allocations as Array<{ profit_settlement_id: string }>).map((row) => row.profit_settlement_id)
      ),
    ];
    const { data: settlements } = await db
      .from("profit_settlements")
      .select("id, investment_cycle_id, fund_id")
      .in("id", settlementIds);
    const settlementMap = new Map(
      ((settlements ?? []) as Array<{
        id: string;
        investment_cycle_id: string;
        fund_id: string | null;
      }>).map((row) => [row.id, row])
    );

    const cycleIds = [
      ...new Set(
        [...settlementMap.values()]
          .map((row) => row.investment_cycle_id)
          .filter(Boolean)
      ),
    ];
    const { data: cycles } = cycleIds.length
      ? await db.from("investment_cycles").select("id, name").in("id", cycleIds)
      : { data: [] };
    const cycleMap = new Map(
      ((cycles ?? []) as Array<{ id: string; name: string }>).map((row) => [row.id, row.name])
    );

    for (const row of allocations as Array<{
      id: string;
      investor_id: string;
      profit_share: number | string;
      profit_settlement_id: string;
    }>) {
      const amount = toNumber(row.profit_share);
      const settlement = settlementMap.get(row.profit_settlement_id);
      const fundId = settlement?.fund_id;
      if (!fundId || amount <= 0) continue;

      const { data: existing } = await db
        .from("transactions")
        .select("id")
        .eq("user_id", investorId)
        .eq("payment_method", "cycle_profit")
        .filter("metadata->>allocationId", "eq", row.id)
        .maybeSingle();
      if (existing) continue;

      const poolName = await readPoolName(fundId);
      const cycleName =
        (settlement?.investment_cycle_id
          ? cycleMap.get(settlement.investment_cycle_id)
          : null) ?? "Cycle";

      await recordInvestorCycleProfitActivity({
        investorId,
        fundId,
        poolName,
        cycleId: settlement?.investment_cycle_id ?? "",
        cycleName,
        settlementId: row.profit_settlement_id,
        allocationId: row.id,
        amount,
      });

      const wallet = await investorProfitWalletService.getOrCreate(investorId, fundId);
      if (wallet.balance <= 0) {
        await investorProfitWalletService.credit(investorId, fundId, amount);
      }
      await syncInvestorPortfolioAfterProfitCredit(
        investorId,
        fundId,
        (await investorProfitWalletService.getOrCreate(investorId, fundId)).balance
      );
    }
  },

  async getPoolManagerDashboard(managerId: string): Promise<PoolManagerFinancialDashboard> {
    const pmAccounts = await ledgerAccountService.ensurePoolManagerAccounts(managerId);
    const availableBalance = await ledgerAccountService.getBalance(pmAccounts.available.id);

    const db = createAdminClient();
    const { data: settlements } = await db
      .from("profit_settlements")
      .select("*")
      .eq("pool_manager_id", managerId)
      .order("created_at", { ascending: false });

    const settlementRows = (settlements ?? []) as SettlementRow[];
    const totalEarnings = settlementRows.reduce(
      (s, r) => s + toNumber(r.pool_manager_earnings),
      0
    );
    const platformFeesPaid = settlementRows.reduce(
      (s, r) => s + toNumber(r.platform_service_fee),
      0
    );
    const transferredToInvestors = settlementRows.reduce(
      (s, r) => s + toNumber(r.investor_distribution_total),
      0
    );

    const pendingDistribution = settlementRows
      .filter((r) => ["pending_review", "confirmed", "distributing"].includes(r.status))
      .reduce((s, r) => s + toNumber(r.investor_distribution_total), 0);

    const cycleIds = settlementRows.map((r) => r.investment_cycle_id);
    const cycleNameMap = new Map<string, string>();
    if (cycleIds.length > 0) {
      const { data: cycles } = await db
        .from("investment_cycles")
        .select("id, name")
        .in("id", cycleIds);
      for (const c of (cycles ?? []) as Array<{ id: string; name: string }>) {
        cycleNameMap.set(c.id, c.name);
      }
    }

    const transactions: PoolManagerFinancialDashboard["transactions"] = [];
    for (const s of settlementRows) {
      if (toNumber(s.pool_manager_earnings) > 0) {
        transactions.push({
          id: `${s.id}-pm-earnings`,
          type: "profit_earnings",
          label: "Pool Manager profit share",
          amount: toNumber(s.pool_manager_earnings),
          currency: s.currency,
          occurredAt: s.confirmed_at ?? s.created_at,
          cycleId: s.investment_cycle_id,
          cycleName: cycleNameMap.get(s.investment_cycle_id),
        });
      }
      if (toNumber(s.platform_service_fee) > 0) {
        transactions.push({
          id: `${s.id}-platform-fee`,
          type: "platform_fee",
          label: "RyvonX platform service fee",
          amount: -toNumber(s.platform_service_fee),
          currency: s.currency,
          occurredAt: s.settlement_date ?? s.created_at,
          cycleId: s.investment_cycle_id,
          cycleName: cycleNameMap.get(s.investment_cycle_id),
        });
      }
    }
    transactions.sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );

    return {
      totalEarnings,
      availableBalance,
      pendingDistribution,
      transferredToInvestors,
      withdrawn: 0,
      platformFeesPaid,
      lifetimeEarnings: totalEarnings,
      cycleSummaries: settlementRows.map((r) => ({
        cycleId: r.investment_cycle_id,
        cycleName: cycleNameMap.get(r.investment_cycle_id) ?? "Cycle",
        settlement: mapSettlement(r),
      })),
      transactions: transactions.slice(0, 50),
    };
  },

  async getPlatformRevenueSummary(): Promise<PlatformRevenueSummary> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data, error } = await db
      .from("platform_revenue_entries")
      .select("*")
      .order("recorded_at", { ascending: false });
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<{
      id: string;
      amount: number;
      recorded_at: string;
      investment_cycle_id: string;
      fund_id: string | null;
      pool_manager_id: string | null;
    }>;

    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const totalServiceFeesEarned = rows.reduce((s, r) => s + toNumber(r.amount), 0);
    const dailyRevenue = rows
      .filter((r) => new Date(r.recorded_at) >= dayStart)
      .reduce((s, r) => s + toNumber(r.amount), 0);
    const monthlyRevenue = rows
      .filter((r) => new Date(r.recorded_at) >= monthStart)
      .reduce((s, r) => s + toNumber(r.amount), 0);
    const yearlyRevenue = rows
      .filter((r) => new Date(r.recorded_at) >= yearStart)
      .reduce((s, r) => s + toNumber(r.amount), 0);

    const byPoolMap = new Map<string, number>();
    const byManagerMap = new Map<string, number>();
    const byCycleMap = new Map<string, number>();

    for (const r of rows) {
      if (r.fund_id) {
        byPoolMap.set(r.fund_id, (byPoolMap.get(r.fund_id) ?? 0) + toNumber(r.amount));
      }
      if (r.pool_manager_id) {
        byManagerMap.set(
          r.pool_manager_id,
          (byManagerMap.get(r.pool_manager_id) ?? 0) + toNumber(r.amount)
        );
      }
      byCycleMap.set(
        r.investment_cycle_id,
        (byCycleMap.get(r.investment_cycle_id) ?? 0) + toNumber(r.amount)
      );
    }

    const fundIds = [...byPoolMap.keys()];
    const managerIds = [...byManagerMap.keys()];
    const cycleIds = [...byCycleMap.keys()];

    const [fundsResult, managersResult, cyclesResult] = await Promise.all([
      fundIds.length
        ? db.from("funds").select("id, name").in("id", fundIds)
        : Promise.resolve({ data: [] }),
      managerIds.length
        ? db.from("pool_managers").select("id, display_name").in("id", managerIds)
        : Promise.resolve({ data: [] }),
      cycleIds.length
        ? db.from("investment_cycles").select("id, name").in("id", cycleIds)
        : Promise.resolve({ data: [] }),
    ]);

    const fundNames = new Map(
      ((fundsResult.data ?? []) as Array<{ id: string; name: string }>).map((f) => [f.id, f.name])
    );
    const managerNames = new Map(
      ((managersResult.data ?? []) as Array<{ id: string; display_name: string }>).map((m) => [
        m.id,
        m.display_name,
      ])
    );
    const cycleNames = new Map(
      ((cyclesResult.data ?? []) as Array<{ id: string; name: string }>).map((c) => [c.id, c.name])
    );

    return {
      totalServiceFeesEarned,
      dailyRevenue,
      monthlyRevenue,
      yearlyRevenue,
      byPool: [...byPoolMap.entries()].map(([fundId, amount]) => ({
        fundId,
        fundName: fundNames.get(fundId) ?? "Pool",
        amount,
      })),
      byManager: [...byManagerMap.entries()].map(([managerId, amount]) => ({
        managerId,
        managerName: managerNames.get(managerId) ?? "Manager",
        amount,
      })),
      byCycle: [...byCycleMap.entries()].map(([cycleId, amount]) => ({
        cycleId,
        cycleName: cycleNames.get(cycleId) ?? "Cycle",
        amount,
      })),
      recentEntries: rows.slice(0, 20).map((r) => ({
        id: r.id,
        amount: toNumber(r.amount),
        recordedAt: r.recorded_at,
        cycleId: r.investment_cycle_id,
        fundId: r.fund_id,
      })),
    };
  },
};
