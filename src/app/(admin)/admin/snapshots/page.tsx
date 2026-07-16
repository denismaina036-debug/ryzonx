import { Button } from "@/components/ui/button";
import { AdminPageHeader, SnapshotsTable } from "@/features/admin/components";
import { adminService } from "@/services/admin.service";

export default async function AdminSnapshotsPage() {
  const snapshots = await adminService.getDailySnapshots();

  return (
    <div>
      <AdminPageHeader
        title="Daily Fund Snapshots"
        description="Immutable end-of-day records. Click Close Trading Day to lock today's snapshot permanently."
        actions={
          <Button size="sm" variant="secondary">
            Close Trading Day
          </Button>
        }
      />
      <SnapshotsTable snapshots={snapshots} />
    </div>
  );
}
