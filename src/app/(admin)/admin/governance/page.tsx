import { AdminPageHeader } from "@/features/admin/components";
import { AdminGovernanceDashboard } from "@/features/admin/components/admin-governance-dashboard";
import { poolGovernanceService } from "@/services/pool-governance.service";

export default async function AdminGovernancePage() {
  let data: Awaited<ReturnType<typeof poolGovernanceService.getDashboard>> | null = null;
  try {
    data = await poolGovernanceService.getDashboard();
  } catch {
    data = null;
  }

  return (
    <div>
      <AdminPageHeader
        title="Governance Dashboard"
        description="Independent oversight of pool health, rule compliance, and investor protection. All actions are recorded by the RyvonX Governance Team."
      />
      {data ? (
        <AdminGovernanceDashboard data={data} />
      ) : (
        <p className="text-sm text-navy-500">Unable to load governance dashboard.</p>
      )}
    </div>
  );
}
