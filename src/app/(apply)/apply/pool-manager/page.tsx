import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { poolManagerApplicationService } from "@/services/pool-manager-application.service";
import { PoolManagerApplicationForm } from "@/features/pool-manager/components/pool-manager-application-form";
import { InvestorPageContent } from "@/components/layouts/investor-page-content";

export default async function ApplyPoolManagerPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`${ROUTES.login}?redirect=${encodeURIComponent(ROUTES.applyPoolManager)}`);
  }

  if (user.role === USER_ROLES.POOL_MANAGER) {
    redirect(ROUTES.poolManager);
  }

  if (user.role === USER_ROLES.VISITOR) {
    redirect(ROUTES.dashboard);
  }

  let application = null;

  try {
    application = await poolManagerApplicationService.getMyApplication();
  } catch {
    // Tables may not exist until migration runs
  }

  return (
    <InvestorPageContent wide className="py-6 sm:py-8">
      <PoolManagerApplicationForm userRole={user.role} initialApplication={application} />
    </InvestorPageContent>
  );
}
