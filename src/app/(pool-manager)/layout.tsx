import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import { AuthProvider } from "@/providers/auth-provider";
import { PoolManagerLayoutShell } from "@/components/layouts/pool-manager-layout";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PoolManagerRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(USER_ROLES.POOL_MANAGER);

  let managerSlug: string | null = null;
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

  return (
    <AuthProvider user={user}>
      <PoolManagerLayoutShell userName={user.fullName} managerSlug={managerSlug}>
        {children}
      </PoolManagerLayoutShell>
    </AuthProvider>
  );
}
