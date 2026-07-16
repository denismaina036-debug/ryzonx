import { AdminPageHeader } from "@/features/admin/components";
import { AdminPmApplications } from "@/features/admin/components/admin-pm-applications";
import { poolManagerAdminService } from "@/services/pool-manager-application.service";

export default async function AdminPoolManagerApplicationsPage() {
  let applications: Awaited<ReturnType<typeof poolManagerAdminService.listApplications>> = [];
  try {
    applications = await poolManagerAdminService.listApplications();
  } catch {
    applications = [];
  }

  return (
    <div>
      <AdminPageHeader
        title="Pool Manager Applications"
        description="Review applicant profiles, strategies, and challenge progress. Approve applicants to unlock Pool Manager capabilities."
      />
      <AdminPmApplications applications={applications} />
    </div>
  );
}
