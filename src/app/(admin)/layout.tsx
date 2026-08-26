import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { AuthProvider } from "@/providers/auth-provider";
import { AdminLayoutShell } from "@/components/layouts/admin-layout";
import { adminService } from "@/services/admin.service";
import { poolManagerAdminService } from "@/services/pool-manager-application.service";
import { filterPoolManagerApplications } from "@/features/admin/utils/pool-manager-applications";

/**
 * Admin route group layout.
 * Protected by middleware and server-side role check.
 */
export default async function AdminRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(USER_ROLES.ADMINISTRATOR);

  let pendingDeposits = 0;
  let pendingWithdrawals = 0;
  let pendingApplications = 0;
  const [statsResult, applicationsResult] = await Promise.allSettled([
    adminService.getDashboardStats(),
    poolManagerAdminService.listApplications(),
  ]);
  if (statsResult.status === "fulfilled") {
    pendingDeposits = statsResult.value.pendingDeposits;
    pendingWithdrawals = statsResult.value.pendingWithdrawals;
  } else {
    console.error("[admin layout] Failed to load pending counts:", statsResult.reason);
  }
  if (applicationsResult.status === "fulfilled") {
    pendingApplications = filterPoolManagerApplications(applicationsResult.value, "pending").length;
  } else {
    console.error("[admin layout] Failed to load pending applications:", applicationsResult.reason);
  }

  return (
    <AuthProvider user={user}>
      <AdminLayoutShell
        userName={user.fullName}
        pendingDeposits={pendingDeposits}
        pendingWithdrawals={pendingWithdrawals}
        pendingApplications={pendingApplications}
      >
        {children}
      </AdminLayoutShell>
    </AuthProvider>
  );
}
