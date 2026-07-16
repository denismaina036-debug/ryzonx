import { AdminPageHeader } from "@/features/admin/components";
import { AdminManagerDevelopmentList } from "@/features/admin/components/admin-capital-growth-panels";
import { poolManagerGrowthService } from "@/services/pool-manager-growth.service";

export default async function AdminManagerDevelopmentPage() {
  let managers: Awaited<ReturnType<typeof poolManagerGrowthService.listManagersForDevelopment>> = [];
  try {
    managers = await poolManagerGrowthService.listManagersForDevelopment();
  } catch {
    managers = [];
  }

  return (
    <div>
      <AdminPageHeader
        title="Manager Development"
        description="Career progression, committee evaluations, and promotion pathways for Pool Managers."
      />
      <AdminManagerDevelopmentList managers={managers} />
    </div>
  );
}
