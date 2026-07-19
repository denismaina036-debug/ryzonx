import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { ledgerService } from "@/services/ledger.service";
import { ledgerAccountService } from "@/services/ledger-account.service";
import { walletProjectionService } from "@/services/wallet-projection.service";
import { distributionService } from "@/services/distribution.service";
import { investmentAllocationService } from "@/services/investment-allocation.service";
import type { FinancialStatement, FinancialStatementLine } from "@/domain/financial/types";

function formatPeriodLabel(from?: string, to?: string): string {
  if (from && to) return `${from.slice(0, 10)} — ${to.slice(0, 10)}`;
  return "All time";
}

export const statementService = {
  async getInvestorStatement(investorId?: string): Promise<FinancialStatement> {
    const user = await requireAuth();
    const targetId = investorId ?? user.id;
    if (targetId !== user.id && user.role !== USER_ROLES.ADMINISTRATOR) {
      throw new Error("Insufficient permissions");
    }

    const isSelf = targetId === user.id;
    const [projection, allocations, distributions] = await Promise.all([
      walletProjectionService.getForInvestor(targetId),
      isSelf
        ? investmentAllocationService.listMine()
        : investmentAllocationService.listAll({ investorId: targetId }),
      distributionService.listForInvestor(targetId),
    ]);

    const lines: FinancialStatementLine[] = [
      { label: "Available balance", amount: projection.available },
      { label: "Reserved for allocations", amount: projection.reserved },
      { label: "Pending commitments", amount: projection.pending },
      { label: "Settled in cycles", amount: projection.settled },
      ...allocations
        .filter((a) => a.status !== "cancelled")
        .slice(0, 20)
        .map((a) => ({
          label: `Allocation ${a.referenceNumber} (${a.status})`,
          amount: a.amount,
          reference: a.referenceNumber,
        })),
      ...distributions
        .filter((d) => d.status === "completed")
        .slice(0, 10)
        .map((d) => ({
          label: `Distribution (${d.status})`,
          amount: d.amount,
        })),
    ];

    const closingBalance = projection.available + projection.reserved + projection.settled;

    return {
      title: "Investor Statement",
      periodLabel: formatPeriodLabel(),
      generatedAt: new Date().toISOString(),
      lines,
      openingBalance: 0,
      closingBalance,
    };
  },

  async getPoolManagerStatement(managerId: string, cycleId?: string): Promise<FinancialStatement> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();

    let cycleQuery = db
      .from("investment_cycles")
      .select("id, name, raised_capital, status")
      .eq("pool_manager_id", managerId);
    if (cycleId) cycleQuery = cycleQuery.eq("id", cycleId);

    const { data: cycles } = await cycleQuery;
    const cycleRows = (cycles ?? []) as Array<{
      id: string;
      name: string;
      raised_capital: number;
      status: string;
    }>;

    const lines: FinancialStatementLine[] = [];
    let totalEscrow = 0;

    for (const cycle of cycleRows) {
      const accounts = await ledgerAccountService.ensureCycleAccounts(cycle.id, cycle.name);
      const escrow = await ledgerAccountService.getBalance(accounts.escrow.id);
      totalEscrow += escrow;
      lines.push({
        label: `${cycle.name} (${cycle.status})`,
        amount: escrow,
        reference: cycle.id,
      });
    }

    return {
      title: "Pool Manager Statement",
      periodLabel: formatPeriodLabel(),
      generatedAt: new Date().toISOString(),
      lines,
      openingBalance: 0,
      closingBalance: totalEscrow,
    };
  },

  async getPlatformStatement(): Promise<FinancialStatement> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const { PLATFORM_ACCOUNT_CODES } = await import("@/constants/ledger");

    const [cash, suspense, equity] = await Promise.all([
      ledgerAccountService.getByCode(PLATFORM_ACCOUNT_CODES.CASH),
      ledgerAccountService.getByCode(PLATFORM_ACCOUNT_CODES.SUSPENSE),
      ledgerAccountService.getByCode(PLATFORM_ACCOUNT_CODES.EQUITY),
    ]);

    const lines: FinancialStatementLine[] = [];
    let closing = 0;

    for (const account of [cash, suspense, equity]) {
      if (!account) continue;
      const balance = await ledgerAccountService.getBalance(account.id);
      closing += balance;
      lines.push({ label: account.name, amount: balance, reference: account.code });
    }

    return {
      title: "Platform Statement",
      periodLabel: formatPeriodLabel(),
      generatedAt: new Date().toISOString(),
      lines,
      openingBalance: 0,
      closingBalance: closing,
    };
  },

  async getLedgerStatement(limit = 100): Promise<FinancialStatement> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const transactions = await ledgerService.listRecent(limit);

    const lines: FinancialStatementLine[] = transactions.map((tx) => ({
      label: `${tx.reference} — ${tx.description}`,
      amount: 0,
      reference: tx.reference,
    }));

    return {
      title: "Ledger Statement",
      periodLabel: formatPeriodLabel(),
      generatedAt: new Date().toISOString(),
      lines,
      openingBalance: 0,
      closingBalance: transactions.length,
    };
  },

  async getSettlementStatement(): Promise<FinancialStatement> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data, error } = await db
      .from("settlement_batches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);

    const lines = ((data ?? []) as Array<{ batch_reference: string; total_amount: number; status: string }>).map(
      (batch) => ({
        label: `${batch.batch_reference} (${batch.status})`,
        amount: Number(batch.total_amount),
        reference: batch.batch_reference,
      })
    );

    const closingBalance = lines.reduce((s, l) => s + l.amount, 0);

    return {
      title: "Settlement Statement",
      periodLabel: formatPeriodLabel(),
      generatedAt: new Date().toISOString(),
      lines,
      openingBalance: 0,
      closingBalance,
    };
  },

  /** Export-ready payload for CSV/JSON download */
  toExportPayload(statement: FinancialStatement): Record<string, unknown> {
    return {
      title: statement.title,
      period: statement.periodLabel,
      generatedAt: statement.generatedAt,
      openingBalance: statement.openingBalance,
      closingBalance: statement.closingBalance,
      lines: statement.lines,
    };
  },
};
