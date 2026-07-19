import { requireAuth } from "@/lib/auth/session";
import { InvestorPageContent } from "@/components/layouts/investor-page-content";
import { InvestorPortfolioView } from "@/features/investor/components/investment/investor-portfolio-view";
import { investorInvestmentService } from "@/services/investor-investment.service";

import { InvestorFinancialPanel } from "@/features/investor/components/investment/investor-financial-panel";
import { investorFinancialService } from "@/services/investor-financial.service";

export default async function InvestorPortfolioPage() {
  await requireAuth();
  const [portfolio, financial] = await Promise.all([
    investorInvestmentService.getPortfolio(),
    investorFinancialService.getFinancialView(),
  ]);

  return (
    <InvestorPageContent className="space-y-8">
      <InvestorPortfolioView data={portfolio} />
      <InvestorFinancialPanel financial={financial} />
    </InvestorPageContent>
  );
}
