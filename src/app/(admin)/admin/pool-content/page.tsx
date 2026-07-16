import { AdminPageHeader } from "@/features/admin/components";
import { AdminContentApprovalQueue } from "@/features/admin/components/admin-capital-growth-panels";
import { poolManagerGrowthService } from "@/services/pool-manager-growth.service";

export default async function AdminPoolContentPage() {
  let items: Awaited<ReturnType<typeof poolManagerGrowthService.listContentQueue>> = [];
  try {
    items = await poolManagerGrowthService.listContentQueue("submitted");
  } catch {
    items = [];
  }

  return (
    <div>
      <AdminPageHeader
        title="Content Approval Queue"
        description="Pool Manager content requires administrator approval before publication."
      />
      <AdminContentApprovalQueue items={items} />
    </div>
  );
}
