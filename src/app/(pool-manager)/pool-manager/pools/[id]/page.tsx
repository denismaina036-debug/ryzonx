import { redirect, notFound } from "next/navigation";
import { USER_ROLES } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { managedPoolService, poolToManagedForm } from "@/services/managed-pool.service";
import { investmentCycleService } from "@/services/investment-cycle.service";
import { strategyService } from "@/services/strategy.service";
import { ManagedPoolEditClient } from "@/features/pool-manager/components/managed-pool/managed-pool-edit-client";

export default async function PoolManagerPoolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== USER_ROLES.POOL_MANAGER) {
    redirect(ROUTES.applyPoolManager);
  }

  const { id } = await params;
  try {
    const [{ pool, config, marketsTraded, profitSharing }, strategies, cycles] = await Promise.all([
      managedPoolService.getForManager(id),
      strategyService.listApprovedForPoolCreation(),
      investmentCycleService.listByFundForManager(id).catch(() => []),
    ]);
    const editable = (pool.lifecycleStatus ?? "draft") === "draft";
    return (
      <ManagedPoolEditClient
        pool={pool}
        initialValues={poolToManagedForm(pool, config, marketsTraded, profitSharing)}
        editable={editable}
        approvedStrategies={strategies.map((s) => ({ id: s.id, name: s.name }))}
        cycles={cycles}
      />
    );
  } catch {
    notFound();
  }
}
