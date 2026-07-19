import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import {
  FINANCIAL_AUDIT_PROFIT_ACTIONS,
  type ProfitSettlementStatus,
} from "@/constants/profit-distribution";
import { generateLedgerReference } from "@/lib/financial/ledger-utils";
import {
  calculateProfitDistribution,
  computeCycleRealizedTradingProfit,
} from "@/lib/financial/profit-distribution-calculator";
import { platformSettingsService } from "@/services/platform-settings.service";
import { auditService } from "@/services/audit.service";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { investmentAllocationService } from "@/services/investment-allocation.service";
import { tradeEntryService } from "@/services/trade-entry.service";
import { ledgerService } from "@/services/ledger.service";
import { ledgerAccountService } from "@/services/ledger-account.service";
import { publishPlatformEvent, PLATFORM_EVENT_TYPES } from "@/lib/platform-events/publish";
import type { ReturnTier } from "@/features/investor/types/account";
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

function parseReturnTiers(raw: unknown): ReturnTier[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((tier): tier is ReturnTier => tier != null && typeof tier === "object")
    .map((tier) => ({
      minAmount: toNumber((tier as ReturnTier).minAmount),
      maxAmount:
        (tier as ReturnTier).maxAmount != null
          ? toNumber((tier as ReturnTier).maxAmount)
          : null,
      returnPct: toNumber((tier as ReturnTier).returnPct),
    }));
}

async function readPoolFinancialConfig(fundId: string | null): Promise<{
  investorSharePct: number;
  poolManagerSharePct: number;
  returnStructure: ReturnTier[];
}> {
  if (!fundId) {
    return { investorSharePct: 80, poolManagerSharePct: 20, returnStructure: [] };
  }
  const db = createAdminClient();
  const { data } = await db
    .from("funds")
    .select("investor_share_pct, pool_manager_share_pct, return_tiers")
    .eq("id", fundId)
    .maybeSingle();
  const row = data as {
    investor_share_pct?: number;
    pool_manager_share_pct?: number;
    return_tiers?: unknown;
  } | null;
  return {
    investorSharePct: toNumber(row?.investor_share_pct) || 80,
    poolManagerSharePct: toNumber(row?.pool_manager_share_pct) || 20,
    returnStructure: parseReturnTiers(row?.return_tiers),
  };
}

export const profitDistributionService = {
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
    const cycle = await investmentCycleService.getById(cycleId);
    if (!cycle) throw new Error("Cycle not found.");
    if (!["distribution", "completed"].includes(cycle.status)) {
      throw new Error("Profit settlement requires a cycle in distribution or completed status.");
    }

    const existing = await this.getByCycleId(cycleId);
    if (existing && !["calculated", "pending_review", "cancelled"].includes(existing.status)) {
      throw new Error("Settlement already confirmed for this cycle.");
    }

    const allocations = await investmentAllocationService.listByCycle(cycleId);
    const settled = allocations.filter((a) =>
      ["settled", "locked", "distributed"].includes(a.status)
    );
    if (settled.length === 0) {
      throw new Error("No settled investor allocations for this cycle.");
    }

    const tradeEntries = await tradeEntryService.listByCycle(cycleId, "admin");
    const journalProfit = computeCycleRealizedTradingProfit(tradeEntries);
    const grossTradingProfit =
      options?.grossTradingProfitOverride != null
        ? Math.max(0, options.grossTradingProfitOverride)
        : journalProfit;

    const poolConfig = await readPoolFinancialConfig(cycle.fundId);
    const cycleCapital = settled.reduce((s, a) => s + a.amount, 0);
    const platformFeeRate = await platformSettingsService.getPlatformServiceFeeRate();

    const breakdown = calculateProfitDistribution({
      grossTradingProfit,
      platformServiceFeeRate: platformFeeRate,
      profitSharing: {
        investorSharePct: poolConfig.investorSharePct,
        poolManagerSharePct: poolConfig.poolManagerSharePct,
      },
      returnStructure: poolConfig.returnStructure,
      allocations: settled.map((a) => ({
        allocationId: a.id,
        investorId: a.investorId,
        capitalBasis: a.amount,
      })),
    });

    const db = createAdminClient();
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
        settlementSequence: [
          "gross_trading_profit",
          "platform_service_fee",
          "net_distributable_profit",
          "pool_manager_share",
          "investor_profit_pool",
          "return_structure_distribution",
        ],
        returnStructure: poolConfig.returnStructure,
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
    if (!isAdmin) {
      const { data: mgr } = await db
        .from("pool_managers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if ((mgr as { id?: string } | null)?.id !== settlement.poolManagerId) {
        throw new Error("Insufficient permissions");
      }
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
    if (!isAdmin) {
      const { data: mgr } = await db
        .from("pool_managers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if ((mgr as { id?: string } | null)?.id !== settlement.poolManagerId) {
        throw new Error("Insufficient permissions");
      }
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

    for (const alloc of toTransfer) {
      const investorAccounts = await ledgerAccountService.ensureInvestorAccounts(alloc.investorId);

      const { transaction } = await ledgerService.postTransaction({
        description: `Investment profit distribution — ${cycle.name}`,
        transactionType: "profit_distribution",
        sourceType: "profit_settlement_allocation",
        sourceId: alloc.id,
        actorId,
        metadata: {
          cycleId: cycle.id,
          cycleName: cycle.name,
          settlementId,
          investorId: alloc.investorId,
        },
        entries: [
          {
            accountId: profitPayable.id,
            entrySide: "debit",
            amount: alloc.profitShare,
            memo: "Investor profit payable release",
          },
          {
            accountId: investorAccounts.available.id,
            entrySide: "credit",
            amount: alloc.profitShare,
            memo: "Investment profit distribution",
          },
        ],
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

    return mapSettlement(completed as SettlementRow);
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
