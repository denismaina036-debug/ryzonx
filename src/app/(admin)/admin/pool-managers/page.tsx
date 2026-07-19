import { poolManagerAdminService } from "@/services/pool-manager-application.service";
import { poolManagerGrowthService } from "@/services/pool-manager-growth.service";
import { challengeService } from "@/services/challenge.service";
import { AdminPoolManagersOverview } from "@/features/admin/components/admin-pool-managers-overview";
import { countPoolManagerApplicationsByFilter } from "@/features/admin/utils/pool-manager-applications";

export default async function AdminPoolManagersPage() {
  let applications: Awaited<ReturnType<typeof poolManagerAdminService.listApplications>> = [];
  let managers: Awaited<ReturnType<typeof poolManagerGrowthService.listManagersForDevelopment>> = [];
  let challengeEnrollments: Awaited<ReturnType<typeof challengeService.getAdminEnrollments>> = [];

  try {
    [applications, managers, challengeEnrollments] = await Promise.all([
      poolManagerAdminService.listApplications(),
      poolManagerGrowthService.listManagersForDevelopment(),
      challengeService.getAdminEnrollments(),
    ]);
  } catch {
    applications = [];
    managers = [];
    challengeEnrollments = [];
  }

  const appCounts = countPoolManagerApplicationsByFilter(applications);

  return (
    <AdminPoolManagersOverview
      pendingApplications={appCounts.pending}
      approvedApplications={appCounts.approved}
      activeManagers={managers.length}
      challengeEnrollments={challengeEnrollments.length}
    />
  );
}
