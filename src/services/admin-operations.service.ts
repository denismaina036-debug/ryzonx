import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { auditService } from "@/services/audit.service";
import { poolGovernanceService } from "@/services/pool-governance.service";
import { strategyService } from "@/services/strategy.service";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { transactionService } from "@/services/transaction.service";
import type { InvestmentCycle, Strategy } from "@/domain/investment/types";
import type { AuditLogEntry } from "@/features/admin/types";
import type { GovernanceDashboardSummary } from "@/domain/governance/types";

export interface AdminOperationsDashboard {
  submittedStrategies: Strategy[];
  submittedCycles: InvestmentCycle[];
  activeManagers: number;
  activeInvestors: number;
  activeCycles: InvestmentCycle[];
  fundingSummary: {
    totalRaised: number;
    totalTarget: number;
    cyclesInFunding: number;
  };
  governance: GovernanceDashboardSummary | null;
  pendingDeposits: number;
  pendingWithdrawals: number;
  recentActivity: AuditLogEntry[];
  openReviews: number;
  lifecycleBottlenecks: Array<{ label: string; count: number; href: string }>;
}

export const adminOperationsService = {
  async getExecutiveDashboard(): Promise<AdminOperationsDashboard> {
    await requireRole(USER_ROLES.ADMINISTRATOR);

    const db = createAdminClient();

    const [
      allStrategies,
      allCycles,
      pendingCounts,
      governance,
      recentActivity,
      managersCount,
      investorsCount,
    ] = await Promise.all([
      strategyService.listAll(),
      investmentCycleService.listAll(),
      transactionService.getPendingCounts(),
      poolGovernanceService.getDashboard().catch(() => null),
      auditService.listRecent(20),
      db
        .from("pool_managers")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved"),
      db
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "investor"),
    ]);

    const submittedStrategies = allStrategies.filter(
      (s) => s.status === "submitted" || s.status === "under_review"
    );
    const submittedCycles = allCycles.filter((c) => c.status === "submitted");
    const activeCycles = allCycles.filter((c) =>
      ["approved", "funding", "trading", "distribution"].includes(c.status)
    );
    const fundingCycles = allCycles.filter((c) => c.status === "funding");

    const totalRaised = fundingCycles.reduce((s, c) => s + c.raisedCapital, 0);
    const totalTarget = fundingCycles.reduce((s, c) => s + (c.targetCapital ?? 0), 0);

    const openReviews =
      submittedStrategies.length +
      submittedCycles.length +
      (governance?.metrics.poolsUnderReview ?? 0);

    const lifecycleBottlenecks = [
      {
        label: "Strategies awaiting review",
        count: submittedStrategies.length,
        href: "/admin/strategies?status=submitted",
      },
      {
        label: "Cycles awaiting approval",
        count: submittedCycles.length,
        href: "/admin/investment-cycles?status=submitted",
      },
      {
        label: "Pools under governance review",
        count: governance?.metrics.poolsUnderReview ?? 0,
        href: "/admin/governance",
      },
      {
        label: "Open violations",
        count: governance?.metrics.openViolations ?? 0,
        href: "/admin/governance/violations",
      },
      {
        label: "Pending deposits",
        count: pendingCounts.pendingDeposits,
        href: "/admin/finance/deposits/pending",
      },
    ].filter((b) => b.count > 0);

    return {
      submittedStrategies,
      submittedCycles,
      activeManagers: managersCount.count ?? 0,
      activeInvestors: investorsCount.count ?? 0,
      activeCycles,
      fundingSummary: {
        totalRaised,
        totalTarget,
        cyclesInFunding: fundingCycles.length,
      },
      governance,
      pendingDeposits: pendingCounts.pendingDeposits,
      pendingWithdrawals: pendingCounts.pendingWithdrawals,
      recentActivity,
      openReviews,
      lifecycleBottlenecks,
    };
  },
};
