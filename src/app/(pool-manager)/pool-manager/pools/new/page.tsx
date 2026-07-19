import { redirect } from "next/navigation";
import { USER_ROLES } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { strategyService } from "@/services/strategy.service";
import { ManagedPoolCreateClient } from "@/features/pool-manager/components/managed-pool/managed-pool-create-client";

export default async function PoolManagerCreatePoolPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== USER_ROLES.POOL_MANAGER) {
    redirect(ROUTES.applyPoolManager);
  }

  const strategies = await strategyService.listApprovedForPoolCreation();

  return (
    <ManagedPoolCreateClient
      approvedStrategies={strategies.map((s) => ({ id: s.id, name: s.name }))}
    />
  );
}
