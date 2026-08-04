import { requireAuth } from "@/lib/auth/session";
import { InvestorPageContent } from "@/components/layouts/investor-page-content";
import { InvestorPoolCyclesView } from "@/features/investor/components/investment/investor-pool-cycles-view";
import { investorInvestmentService } from "@/services/investor-investment.service";

export default async function InvestorPortfolioPage() {
  await requireAuth();
  const cycles = await investorInvestmentService.getPoolCycles();

  return (
    <InvestorPageContent className="space-y-8">
      <InvestorPoolCyclesView data={cycles} />
    </InvestorPageContent>
  );
}
