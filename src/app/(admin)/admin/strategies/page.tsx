import { AdminAdministrationShell } from "@/features/admin/components/admin-administration-shell";
import { AdminStrategiesReviewClient } from "@/features/admin/components/admin-strategies-review-client";
import { strategyService } from "@/services/strategy.service";
import { createAdminClient } from "@/lib/supabase/admin";

async function getManagerNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const db = createAdminClient();
  const { data } = await db.from("pool_managers").select("id, display_name").in("id", ids);
  const map = new Map<string, string>();
  for (const row of (data ?? []) as Array<{ id: string; display_name: string }>) {
    map.set(row.id, row.display_name);
  }
  return map;
}

export default async function AdminStrategiesPage() {
  const [submitted, underReview, approved] = await Promise.all([
    strategyService.listAll({ status: "submitted" }),
    strategyService.listAll({ status: "under_review" }),
    strategyService.listAll({ status: "approved" }),
  ]);

  const pending = [...submitted, ...underReview].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const recentApproved = approved
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10);

  const strategies = [...pending, ...recentApproved];
  const managerNames = await getManagerNames([...new Set(strategies.map((s) => s.poolManagerId))]);

  return (
    <AdminAdministrationShell
      title="Strategy Review"
      description="Approve or reject pool manager strategies. No extra steps required."
    >
      <AdminStrategiesReviewClient strategies={strategies} managerNames={managerNames} />
    </AdminAdministrationShell>
  );
}
