import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { AuthProvider } from "@/providers/auth-provider";
import { AdminLayoutShell } from "@/components/layouts/admin-layout";
import { adminService } from "@/services/admin.service";

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
  try {
    const stats = await adminService.getDashboardStats();
    pendingDeposits = stats.pendingDeposits;
    pendingWithdrawals = stats.pendingWithdrawals;
  } catch (error) {
    console.error("[admin layout] Failed to load pending counts:", error);
  }

  return (
    <AuthProvider user={user}>
      <AdminLayoutShell
        userName={user.fullName}
        pendingDeposits={pendingDeposits}
        pendingWithdrawals={pendingWithdrawals}
      >
        {children}
      </AdminLayoutShell>
    </AuthProvider>
  );
}