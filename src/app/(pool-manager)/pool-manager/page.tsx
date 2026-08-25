import { redirect } from "next/navigation";
import { USER_ROLES } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { managedPoolService } from "@/services/managed-pool.service";
import { strategyService } from "@/services/strategy.service";
import {
  ManagedPoolListClient,
  type ManagedPoolListItem,
} from "@/features/pool-manager/components/managed-pool/managed-pool-list-client";
import { referralService } from "@/services/referral.service";

export default async function PoolManagerDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== USER_ROLES.POOL_MANAGER) {
    redirect(ROUTES.applyPoolManager);
  }

  const [pools, strategies, referralSummary] = await Promise.all([
    managedPoolService.listMine(),
    strategyService.listMine(),
    referralService
      .processPendingRewardForUser(user.id)
      .catch(() => null)
      .then(() => referralService.getSummary(user.id)),
  ]);

  const items: ManagedPoolListItem[] = await Promise.all(
    pools.map(async (pool) => ({
      pool,
      cycles: await managedPoolService.listCycles(pool.id).catch(() => []),
    }))
  );

  return (
    <ManagedPoolListClient
      items={items}
      strategies={strategies}
      referralSummary={referralSummary}
    />
  );
}
