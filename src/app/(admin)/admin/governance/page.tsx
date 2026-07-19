import { AdminGovernanceShell } from "@/features/admin/components/admin-governance-shell";
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
    <AdminGovernanceShell
      title="Governance Dashboard"
      description="Independent oversight of pool health, rule compliance, and investor protection."
    >
      {data ? (
        <AdminGovernanceDashboard data={data} />
      ) : (
        <p className="text-sm text-navy-500">Unable to load governance dashboard.</p>
      )}
    </AdminGovernanceShell>
  );
}
