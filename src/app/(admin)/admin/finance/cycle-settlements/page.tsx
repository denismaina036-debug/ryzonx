import { AdminFinanceShell } from "@/features/admin/components/admin-finance-shell";
import { CycleCapitalReturnsTable } from "@/features/admin/components/cycle-capital-returns-table";
import { cycleInvestorSettlementService } from "@/services/investment-engine/cycle-investor-settlement.service";

export default async function AdminCycleSettlementsPage() {
  const settlements = await cycleInvestorSettlementService.listPendingCapitalReturns();

  return (
    <AdminFinanceShell
      title="Cycle capital returns"
      description="Approve returning invested capital from completed cycles to investor Funding Wallets. Profit transfers are immediate and do not appear here."
    >
      <CycleCapitalReturnsTable settlements={settlements} />
    </AdminFinanceShell>
  );
}
