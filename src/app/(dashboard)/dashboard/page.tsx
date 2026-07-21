import { requireAuth } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { investorService } from "@/services/investor.service";
import { investorInvestmentService } from "@/services/investor-investment.service";
import { challengeCenterService } from "@/services/challenge-center.service";
import { InvestorDashboardView } from "@/features/investor";
import { resolvePmJourneyCardVariant } from "@/domain/investor/pm-journey-variant";

export default async function InvestorDashboardPage() {
  const user = await requireAuth();
  const admin = createAdminClient();

  const [data, homeInvestment, challengeState, applicationResult] = await Promise.all([
    investorService.getDashboardPageData(),
    investorInvestmentService.getHomeData(),
    challengeCenterService.getChallengeCenterState(user.id).catch(() => null),
    admin
      .from("pool_manager_applications")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const pmJourneyVariant = resolvePmJourneyCardVariant({
    role: user.role,
    registrationIntent: user.registrationIntent,
    hasStartedApplication: Boolean(applicationResult.data),
  });

  return (
    <InvestorDashboardView
      user={user}
      data={data}
      homeInvestment={homeInvestment}
      challengeDisplayStatus={challengeState?.displayStatus}
      challengeProgressPct={challengeState?.statistics?.progressPct}
      pmJourneyVariant={pmJourneyVariant}
    />
  );
}
