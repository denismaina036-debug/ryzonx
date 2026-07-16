import { getInvestorShellProps } from "@/lib/auth/investor-shell-props";
import { AuthProvider } from "@/providers/auth-provider";
import { DashboardLayoutShell } from "@/components/layouts/dashboard-layout";

export default async function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, unreadNotifications, hasActivePool } = await getInvestorShellProps();

  return (
    <AuthProvider user={user}>
      <DashboardLayoutShell
        userName={user?.fullName}
        userRole={user?.role}
        unreadNotifications={unreadNotifications}
        hasActivePool={hasActivePool}
      >
        {children}
      </DashboardLayoutShell>
    </AuthProvider>
  );
}
