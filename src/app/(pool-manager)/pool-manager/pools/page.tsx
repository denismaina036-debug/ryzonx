import { redirect } from "next/navigation";
import { USER_ROLES } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { poolManagerDashboardService } from "@/services/pool-manager-dashboard.service";
import { PoolManagerPoolsClient } from "@/features/pool-manager/components/pool-manager-pools-client";

export default async function PoolManagerPoolsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== USER_ROLES.POOL_MANAGER) {
    redirect(ROUTES.applyPoolManager);
  }

  const pools = await poolManagerDashboardService.getMyPools();
  return <PoolManagerPoolsClient initialPools={pools} />;
}
