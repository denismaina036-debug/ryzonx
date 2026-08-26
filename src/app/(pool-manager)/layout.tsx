import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { AuthProvider } from "@/providers/auth-provider";
import { PoolManagerLayoutShell } from "@/components/layouts/pool-manager-layout";
import { createAdminClient } from "@/lib/supabase/admin";
import { poolManagerWorkspaceService } from "@/services/pool-manager-workspace.service";

export default async function PoolManagerRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(USER_ROLES.POOL_MANAGER);

  let managerSlug: string | null = null;
  let quickActionContext = {
    hasStrategy: false,
    hasApprovedStrategy: false,
    hasApprovedPool: false,
    hasActiveCycle: false,
    activeCycleId: null as string | null,
    approvedPoolId: null as string | null,
  };

  const [managerResult, quickActionResult] = await Promise.allSettled([
    (async () => {
      const db = createAdminClient();
      const { data } = await db
        .from("pool_managers")
        .select("slug")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .maybeSingle();
      return (data as { slug?: string } | null)?.slug ?? null;
    })(),
    poolManagerWorkspaceService.getQuickActionContext(),
  ]);
  if (managerResult.status === "fulfilled") {
    managerSlug = managerResult.value;
  }
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
        managerSlug={managerSlug}
        quickActionContext={quickActionContext}
      >
        {children}
      </PoolManagerLayoutShell>
    </AuthProvider>
  );
}
