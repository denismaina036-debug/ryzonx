import { AdminPageHeader } from "@/features/admin/components";
import { AdminGovernanceViolations } from "@/features/admin/components/admin-governance-rules-violations";
import { poolGovernanceService } from "@/services/pool-governance.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";

export default async function AdminGovernanceViolationsPage() {
    let violations: Awaited<ReturnType<typeof poolGovernanceService.listViolations>> = [];
    let pools: Array<{ id: string; name: string }> = [];

  try {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    violations = await poolGovernanceService.listViolations(200);

    const { data: funds } = await db.from("funds").select("id, name").neq("status", "archived");
    pools = (funds ?? []).map((f) => ({
      id: (f as { id: string }).id,
      name: (f as { name: string }).name,
    }));
  } catch {
    violations = [];
    pools = [];
  }

  return (
    <div>
      <AdminPageHeader
        title="Rule Violations"
        description="Track and resolve governance rule breaches across all pools."
      />
      <AdminGovernanceViolations violations={violations} pools={pools} />
    </div>
  );
}
