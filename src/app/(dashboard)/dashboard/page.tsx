import { requireAuth } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { investorService } from "@/services/investor.service";
import { investorInvestmentService } from "@/services/investor-investment.service";
import { challengeCenterService } from "@/services/challenge-center.service";
import { InvestorDashboardView } from "@/features/investor";
import { resolvePmJourneyCardVariant } from "@/domain/investor/pm-journey-variant";
import { referralService } from "@/services/referral.service";

export default async function InvestorDashboardPage() {
  const user = await requireAuth();
  const admin = createAdminClient();

  const [data, homeInvestment, challengeState, applicationResult, referralSummary] = await Promise.all([
    investorService.getDashboardPageData(),
    investorInvestmentService.getHomeData(),
    challengeCenterService.getChallengeCenterState(user.id).catch(() => null),
    admin
      .from("pool_manager_applications")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle(),
    referralService
      .processPendingRewardForUser(user.id)
      .catch(() => null)
      .then(() => referralService.getSummary(user.id)),
  ]);

  const applicationRow = applicationResult.data as { id: string; status: string } | null;
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
      challengeDisplayStatus={challengeState?.displayStatus}
      challengeProgressPct={challengeState?.statistics?.progressPct}
      pmJourneyVariant={pmJourneyVariant}
      referralSummary={referralSummary}
    />
  );
}
