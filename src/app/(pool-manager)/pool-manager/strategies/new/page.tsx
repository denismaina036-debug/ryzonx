import { redirect } from "next/navigation";
import { USER_ROLES } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { PmStrategyCreateClient } from "@/features/pool-manager/components/workspace/pm-strategy-create-client";

export default async function PoolManagerNewStrategyPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== USER_ROLES.POOL_MANAGER) {
    redirect(ROUTES.applyPoolManager);
  }

  const { returnTo } = await searchParams;

  return <PmStrategyCreateClient returnTo={returnTo ?? null} />;
}
