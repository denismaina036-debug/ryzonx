import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { poolManagerApplicationService } from "@/services/pool-manager-application.service";
import { PoolManagerApplicationWizard } from "@/features/pool-manager/components/application-wizard";
import { InvestorPageContent } from "@/components/layouts/investor-page-content";

export default async function ApplyPoolManagerPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`${ROUTES.login}?redirect=${encodeURIComponent(ROUTES.applyPoolManager)}`);
  }

  if (user.role === USER_ROLES.VISITOR) {
    redirect(ROUTES.dashboard);
  }

  let application = null;
  let challenge = null;

  try {
    [application, challenge] = await Promise.all([
      poolManagerApplicationService.getMyApplication(),
      poolManagerApplicationService.getActiveChallengeForApplication(),
    ]);
  } catch {
    // Tables may not exist until migration runs — wizard handles empty state
  }

  return (
    <InvestorPageContent wide className="py-6 sm:py-8">
      <PoolManagerApplicationWizard
        userRole={user.role}
        initialApplication={application}
        initialChallenge={challenge}
      />
    </InvestorPageContent>
  );
}
