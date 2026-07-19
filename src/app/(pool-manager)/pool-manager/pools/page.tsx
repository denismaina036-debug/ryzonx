import { redirect } from "next/navigation";
import { USER_ROLES } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { managedPoolService } from "@/services/managed-pool.service";
import { ManagedPoolListClient } from "@/features/pool-manager/components/managed-pool/managed-pool-list-client";

export default async function PoolManagerPoolsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== USER_ROLES.POOL_MANAGER) {
    redirect(ROUTES.applyPoolManager);
  }

  const pools = await managedPoolService.listMine();
  return <ManagedPoolListClient initialPools={pools} />;
}
