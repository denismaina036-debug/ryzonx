import { requireAuth } from "@/lib/auth/session";
import { InvestorPageContent } from "@/components/layouts/investor-page-content";
import { InvestorPoolCyclesView } from "@/features/investor/components/investment/investor-pool-cycles-view";
import { CycleSettlementChoices } from "@/features/investor/components/cycle-settlement-choices";
import { investorInvestmentService } from "@/services/investor-investment.service";
import { cycleInvestorSettlementService } from "@/services/investment-engine/cycle-investor-settlement.service";

export default async function InvestorPortfolioPage() {
  const user = await requireAuth();
  const [cycles, pendingSettlements] = await Promise.all([
    investorInvestmentService.getPoolCycles(),
    cycleInvestorSettlementService.listPendingForInvestor(user.id),
  ]);

  return (
    <InvestorPageContent className="space-y-8">
      <CycleSettlementChoices settlements={pendingSettlements} />
      <InvestorPoolCyclesView data={cycles} />
    </InvestorPageContent>
  );
}
