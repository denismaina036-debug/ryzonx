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

  try {
    const db = createAdminClient();
    const { data } = await db
      .from("pool_managers")
      .select("slug")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .maybeSingle();
    managerSlug = (data as { slug?: string } | null)?.slug ?? null;
  } catch {
    managerSlug = null;
  }

  try {
    quickActionContext = await poolManagerWorkspaceService.getQuickActionContext();
  } catch (error) {
    console.error("[pool-manager layout] Failed to load quick action context:", error);
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
