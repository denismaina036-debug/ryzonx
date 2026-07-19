import { notFound } from "next/navigation";
import { AdminPmApplications } from "@/features/admin/components/admin-pm-applications";
import { AdminPoolManagersShell } from "@/features/admin/components/admin-pool-managers-shell";
import { AdminStatusNav } from "@/features/admin/components/admin-sub-nav";
import { POOL_MANAGERS_APPLICATION_STATUS_NAV } from "@/features/admin/constants/nav";
import type { PoolManagerApplicationFilter } from "@/constants/routes";
import { poolManagerAdminService } from "@/services/pool-manager-application.service";
import {
  countPoolManagerApplicationsByFilter,
  filterPoolManagerApplications,
} from "@/features/admin/utils/pool-manager-applications";

const VALID_STATUSES: PoolManagerApplicationFilter[] = ["pending", "approved", "rejected", "all"];

interface PageProps {
  params: Promise<{ status: string }>;
}

export default async function AdminPoolManagersApplicationsPage({ params }: PageProps) {
  const { status } = await params;
  if (!VALID_STATUSES.includes(status as PoolManagerApplicationFilter)) {
    notFound();
  }

  const filter = status as PoolManagerApplicationFilter;
  let applications: Awaited<ReturnType<typeof poolManagerAdminService.listApplications>> = [];
  try {
    applications = await poolManagerAdminService.listApplications();
  } catch {
    applications = [];
  }

  const counts = countPoolManagerApplicationsByFilter(applications);
  const filtered = filterPoolManagerApplications(applications, filter);

  return (
    <AdminPoolManagersShell
      title="Applications"
      description="Review applicant profiles, strategies, and challenge progress. Approve applicants to unlock Pool Manager capabilities."
      statusNav={
        <AdminStatusNav
          basePath="/admin/pool-managers/applications"
          currentStatus={filter}
          items={POOL_MANAGERS_APPLICATION_STATUS_NAV.map((item) => ({
            ...item,
            count: counts[item.status],
          }))}
        />
      }
    >
      <AdminPmApplications applications={filtered} />
    </AdminPoolManagersShell>
  );
}
