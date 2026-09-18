import { requireAuth } from "@/lib/auth/session";
import { investorService } from "@/services/investor.service";
import { investorInvestmentService } from "@/services/investor-investment.service";
import { getInvestorRequestContext } from "@/services/investor-request-context.service";
import { InvestorDashboardView } from "@/features/investor";
import { resolvePmJourneyCardVariant } from "@/domain/investor/pm-journey-variant";
import { referralService } from "@/services/referral.service";

export default async function InvestorDashboardPage() {
  const user = await requireAuth();

  const [data, homeInvestment, requestContext, referralSummary] = await Promise.all([
    investorService.getDashboardPageData(),
    investorInvestmentService.getHomeData(),
    getInvestorRequestContext(user.id),
    referralService
      .processPendingRewardForUser(user.id)
      .catch(() => null)
      .then(() => referralService.getSummary(user.id)),
  ]);

  const applicationRow = requestContext.application;
  const pmJourneyVariant = resolvePmJourneyCardVariant({
    role: user.role,
    registrationIntent: user.registrationIntent,
    hasStartedApplication: Boolean(applicationRow),
    applicationStatus: applicationRow?.status ?? null,
  });

  return (
    <InvestorDashboardView
      user={user}
      data={data}
      homeInvestment={homeInvestment}
      challengeDisplayStatus={requestContext.challengeState?.displayStatus}
      challengeProgressPct={requestContext.challengeState?.statistics?.progressPct}
      pmJourneyVariant={pmJourneyVariant}
      referralSummary={referralSummary}
    />
  );
}
