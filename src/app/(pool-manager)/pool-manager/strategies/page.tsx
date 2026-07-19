import { redirect } from "next/navigation";
import { USER_ROLES } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { strategyService } from "@/services/strategy.service";
import { PmStrategiesClient } from "@/features/pool-manager/components/workspace/pm-strategies-client";

export default async function PoolManagerStrategiesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== USER_ROLES.POOL_MANAGER) {
    redirect(ROUTES.applyPoolManager);
  }

  const strategies = await strategyService.listMine();

  return <PmStrategiesClient initialStrategies={strategies} />;
}
