import { AdminManagerDevelopmentList } from "@/features/admin/components/admin-capital-growth-panels";
import { AdminPoolManagersShell } from "@/features/admin/components/admin-pool-managers-shell";
import { poolManagerGrowthService } from "@/services/pool-manager-growth.service";

export default async function AdminPoolManagersDevelopmentPage() {
  let managers: Awaited<ReturnType<typeof poolManagerGrowthService.listManagersForDevelopment>> = [];
  try {
    managers = await poolManagerGrowthService.listManagersForDevelopment();
  } catch {
    managers = [];
  }

  return (
    <AdminPoolManagersShell
      title="Manager Development"
      description="Career progression, committee evaluations, and promotion pathways for Pool Managers."
    >
      <AdminManagerDevelopmentList managers={managers} />
    </AdminPoolManagersShell>
  );
}
