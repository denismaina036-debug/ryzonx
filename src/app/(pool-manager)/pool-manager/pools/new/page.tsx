import { redirect } from "next/navigation";
import { USER_ROLES } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { strategyService } from "@/services/strategy.service";
import { platformInvestmentLevelService } from "@/services/platform-investment-level.service";
import { ManagedPoolCreateClient } from "@/features/pool-manager/components/managed-pool/managed-pool-create-client";

export default async function PoolManagerCreatePoolPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== USER_ROLES.POOL_MANAGER) {
    redirect(ROUTES.applyPoolManager);
  }

  const [strategies, investmentLevels] = await Promise.all([
    strategyService.listApprovedForPoolCreation(),
    platformInvestmentLevelService.listActive(),
  ]);
  const defaultStrategyId =
    strategies.length > 0
      ? [...strategies].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]!.id
      : null;

  return (
    <ManagedPoolCreateClient
      approvedStrategies={strategies.map((s) => ({ id: s.id, name: s.name }))}
      defaultStrategyId={defaultStrategyId}
      investmentLevels={investmentLevels}
    />
  );
}
