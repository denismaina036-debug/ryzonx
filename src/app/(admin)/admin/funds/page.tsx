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
        title="Pool Review"
        description="Review Pool Manager submissions. Approve pools to make them live in the Marketplace. Administrators do not create pools."
      />
      <AdminPoolsManager funds={funds} investors={investors} reviewOnly />
    </div>
  );
}
