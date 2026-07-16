import { AdminPageHeader } from "@/features/admin/components";
import { AdminCapitalAllocationDashboard } from "@/features/admin/components/admin-capital-allocation-dashboard";
import { poolCapitalAllocationService } from "@/services/pool-capital-allocation.service";

export default async function AdminCapitalAllocationPage() {
  let data: Awaited<ReturnType<typeof poolCapitalAllocationService.getDashboard>> | null = null;
  try {
    data = await poolCapitalAllocationService.getDashboard();
  } catch {
    data = null;
  }

  return (
    <div>
      <AdminPageHeader
        title="Capital Allocation Program"
        description="RyvonX company capital allocation — controlled exclusively by the RyvonX Capital Committee. Investor funds remain the primary source of AUM."
      />
      {data ? (
        <AdminCapitalAllocationDashboard data={data} />
      ) : (
        <p className="text-sm text-navy-500">Unable to load capital allocation dashboard.</p>
      )}
    </div>
  );
}
