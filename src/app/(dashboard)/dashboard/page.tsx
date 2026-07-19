import { requireAuth } from "@/lib/auth/session";
import { investorService } from "@/services/investor.service";import { investorInvestmentService } from "@/services/investor-investment.service";
import { challengeCenterService } from "@/services/challenge-center.service";
import { InvestorDashboardView } from "@/features/investor";

export default async function InvestorDashboardPage() {
  const user = await requireAuth();

  const [data, homeInvestment, challengeState] = await Promise.all([
    investorService.getDashboardPageData(),
    investorInvestmentService.getHomeData(),
    challengeCenterService.getChallengeCenterState(user.id).catch(() => null),
  ]);

  return (
    <InvestorDashboardView
      user={user}
      data={data}
      homeInvestment={homeInvestment}
      challengeDisplayStatus={challengeState?.displayStatus}
      challengeProgressPct={challengeState?.statistics?.progressPct}
    />
  );
}
