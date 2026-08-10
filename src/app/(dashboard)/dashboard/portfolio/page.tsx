import { requireAuth } from "@/lib/auth/session";
import { InvestorPageContent } from "@/components/layouts/investor-page-content";
import { InvestorPoolCyclesView } from "@/features/investor/components/investment/investor-pool-cycles-view";
import { CycleSettlementChoices } from "@/features/investor/components/cycle-settlement-choices";
import { investorInvestmentService } from "@/services/investor-investment.service";
import { investorService } from "@/services/investor.service";

export default async function InvestorPortfolioPage() {
  await requireAuth();
  const [cycles, investmentsPage] = await Promise.all([
    investorInvestmentService.getPoolCycles(),
    investorService.getInvestmentsPageData(),
  ]);

  return (
    <InvestorPageContent className="space-y-8">
      <CycleSettlementChoices settlements={investmentsPage.actionableSettlements} />
      <InvestorPoolCyclesView data={cycles} />
    </InvestorPageContent>
  );
}
