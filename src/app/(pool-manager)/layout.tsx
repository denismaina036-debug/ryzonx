import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { AuthProvider } from "@/providers/auth-provider";
import { PoolManagerLayoutShell } from "@/components/layouts/pool-manager-layout";
import { poolManagerWorkspaceService } from "@/services/pool-manager-workspace.service";

export default async function PoolManagerRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(USER_ROLES.POOL_MANAGER);

  let quickActionContext = {
    managerSlug: null as string | null,
    hasStrategy: false,
    hasApprovedStrategy: false,
    hasApprovedPool: false,
    hasActiveCycle: false,
    activeCycleId: null as string | null,
    approvedPoolId: null as string | null,
  };

  const quickActionResult = await Promise.allSettled([
    poolManagerWorkspaceService.getQuickActionContext(),
  ]).then(([result]) => result);
  if (quickActionResult.status === "fulfilled") {
    quickActionContext = quickActionResult.value;
  } else {
    console.error(
      "[pool-manager layout] Failed to load quick action context:",
      quickActionResult.reason
    );
  }

  return (
    <AuthProvider user={user}>
      <PoolManagerLayoutShell
        userName={user.fullName}
        avatarUrl={user.avatarUrl}
        userEmail={user.email}
        managerSlug={quickActionContext.managerSlug}
        quickActionContext={quickActionContext}
      >
        {children}
      </PoolManagerLayoutShell>
    </AuthProvider>
  );
}
