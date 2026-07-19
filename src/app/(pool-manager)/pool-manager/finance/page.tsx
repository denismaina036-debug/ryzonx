import { redirect } from "next/navigation";
import { USER_ROLES } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { PmFinanceDashboardClient } from "@/features/pool-manager/components/finance/pm-finance-dashboard-client";

export default async function PoolManagerFinancePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== USER_ROLES.POOL_MANAGER) {
    redirect(ROUTES.applyPoolManager);
  }

  return <PmFinanceDashboardClient />;
}
