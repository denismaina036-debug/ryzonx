import { AdminGovernanceShell } from "@/features/admin/components/admin-governance-shell";
import { AdminGovernanceRules } from "@/features/admin/components/admin-governance-rules-violations";
import { poolGovernanceService } from "@/services/pool-governance.service";

export default async function AdminGovernanceRulesPage() {
  let rules: Awaited<ReturnType<typeof poolGovernanceService.listRules>> = [];
  try {
    rules = await poolGovernanceService.listRules();
  } catch {
    rules = [];
  }

  return (
    <AdminGovernanceShell
      title="Pool Governance Rules"
      description="Platform-wide and per-pool rules enforced by the RyvonX Risk Committee."
    >
      <AdminGovernanceRules rules={rules} />
    </AdminGovernanceShell>
  );
}
