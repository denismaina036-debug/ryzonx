import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { poolManagerApplicationService } from "@/services/pool-manager-application.service";
import { pmAdmissionSettingsService } from "@/services/pm-admission-settings.service";
import { PoolManagerAdmissionWizard } from "@/features/pool-manager/components/pool-manager-admission-wizard";
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
  let settings = pmAdmissionSettingsService.defaults();

  try {
    [application, settings] = await Promise.all([
      poolManagerApplicationService.getMyApplication(),
      pmAdmissionSettingsService.getPublic(),
    ]);
  } catch {
    // Tables may not exist until migration runs
  }

  return (
    <InvestorPageContent wide className="py-6 sm:py-8">
      <PoolManagerAdmissionWizard
        userRole={user.role}
        initialApplication={application}
        initialSettings={settings}
        registrationCountry={user.registrationCountry}
      />
    </InvestorPageContent>
  );
}
