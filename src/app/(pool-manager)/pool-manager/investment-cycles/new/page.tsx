import { redirect } from "next/navigation";
import { USER_ROLES } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { managedPoolService } from "@/services/managed-pool.service";
import { platformInvestmentLevelService } from "@/services/platform-investment-level.service";
import { PmCreateCycleClient } from "@/features/pool-manager/components/workspace/pm-create-cycle-client";

interface PageProps {
  searchParams: Promise<{ poolId?: string }>;
}

export default async function PoolManagerNewCyclePage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user || user.role !== USER_ROLES.POOL_MANAGER) {
    redirect(ROUTES.applyPoolManager);
  }

  const { poolId: initialPoolId } = await searchParams;

  const [pools, investmentLevels] = await Promise.all([
    managedPoolService.listMine(),
    platformInvestmentLevelService.listActive(),
  ]);

  const poolOptions = await Promise.all(
    pools.map(async (pool) => ({
      pool,
      cycles: await managedPoolService.listCycles(pool.id).catch(() => []),
    }))
  );

  return (
    <PmCreateCycleClient
      pools={poolOptions}
      investmentLevels={investmentLevels}
      initialPoolId={initialPoolId ?? null}
    />
  );
}
