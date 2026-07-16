import { AdminPageHeader, AdminPoolsManager } from "@/features/admin/components";
import { poolAdminService } from "@/services/pool-admin.service";

export default async function AdminFundsPage() {
  const [funds, investors] = await Promise.all([
    poolAdminService.getFunds(),
    poolAdminService.getInvestorsForInvite(),
  ]);

  return (
    <div>
      <AdminPageHeader
        title="Trading Pools"
        description="Create pools, set targets and return tiers, and invite investors to participate."
      />
      <AdminPoolsManager funds={funds} investors={investors} />
    </div>
  );
}
