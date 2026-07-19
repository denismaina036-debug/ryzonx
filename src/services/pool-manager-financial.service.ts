import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { investmentAllocationService } from "@/services/investment-allocation.service";
import { ledgerAccountService } from "@/services/ledger-account.service";
import { distributionService } from "@/services/distribution.service";
import { profitDistributionService } from "@/services/profit-distribution.service";
import type { ProfitSettlement, ProfitSettlementAllocation } from "@/domain/financial/types";

export interface PoolManagerCycleFinancialSummary {
  cycleId: string;
  cycleName: string;
  cycleStatus: string;
  raisedCapital: number;
  escrowBalance: number;
  fundingConfirmedCount: number;
  settledCount: number;
  pendingSettlementCount: number;
  distributionPreparationCount: number;
  profitSettlement: ProfitSettlement | null;
  profitAllocations: ProfitSettlementAllocation[];
  investorFunding: Array<{
    investorId: string;
    amount: number;
    status: string;
    referenceNumber: string;
  }>;
}

export const poolManagerFinancialService = {
  async getCycleFinancialSummary(cycleId: string): Promise<PoolManagerCycleFinancialSummary> {
    const user = await requireAuth();
    const cycle = await investmentCycleService.getByIdForManager(cycleId);

    const db = createAdminClient();
    const { data: managerRow } = await db
      .from("pool_managers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const isAdmin = user.role === USER_ROLES.ADMINISTRATOR;
    const managerId = (managerRow as { id?: string } | null)?.id;
    if (!isAdmin && managerId !== cycle.poolManagerId) {
      throw new Error("Insufficient permissions");
    }

    const allocations = await investmentAllocationService.listByCycle(cycleId);
    const cycleAccounts = await ledgerAccountService.ensureCycleAccounts(cycle.id, cycle.name);
    const escrowBalance = await ledgerAccountService.getBalance(cycleAccounts.escrow.id);
    const distributions = await distributionService.listForCycle(cycleId);
    const profitSettlement = await profitDistributionService.getByCycleId(cycleId);
    const profitAllocations = profitSettlement
      ? await profitDistributionService.listAllocations(profitSettlement.id)
      : [];

    return {
      cycleId: cycle.id,
      cycleName: cycle.name,
      cycleStatus: cycle.status,
      raisedCapital: cycle.raisedCapital,
      escrowBalance,
      fundingConfirmedCount: allocations.filter((a) => a.status === "funding_confirmed").length,
      settledCount: allocations.filter((a) => ["settled", "locked", "distributed"].includes(a.status)).length,
      pendingSettlementCount: allocations.filter((a) => a.status === "pending").length,
      distributionPreparationCount: distributions.filter((d) =>
        ["preparation", "batch", "pending", "approved"].includes(d.status)
      ).length,
      profitSettlement,
      profitAllocations,
      investorFunding: allocations.map((a) => ({
        investorId: a.investorId,
        amount: a.amount,
        status: a.status,
        referenceNumber: a.referenceNumber,
      })),
    };
  },
};
