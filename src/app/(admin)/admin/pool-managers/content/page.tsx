import { AdminContentApprovalQueue } from "@/features/admin/components/admin-capital-growth-panels";
import { AdminPoolManagersShell } from "@/features/admin/components/admin-pool-managers-shell";
import { poolManagerGrowthService } from "@/services/pool-manager-growth.service";

export default async function AdminPoolManagersContentPage() {
  let items: Awaited<ReturnType<typeof poolManagerGrowthService.listContentQueue>> = [];
  try {
    items = await poolManagerGrowthService.listContentQueue("submitted");
  } catch {
    items = [];
  }

  return (
    <AdminPoolManagersShell
      title="Content Approval"
      description="Pool Manager content requires administrator approval before publication."
    >
      <AdminContentApprovalQueue items={items} />
    </AdminPoolManagersShell>
  );
}
