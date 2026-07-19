import { AdminAchievementsPanel } from "@/features/admin/components/admin-capital-growth-panels";
import { AdminPoolManagersShell } from "@/features/admin/components/admin-pool-managers-shell";
import { poolManagerGrowthService } from "@/services/pool-manager-growth.service";

export default async function AdminPoolManagersAchievementsPage() {
  let definitions: Awaited<ReturnType<typeof poolManagerGrowthService.listAchievementDefinitions>> = [];
  let managers: Awaited<ReturnType<typeof poolManagerGrowthService.listManagersForDevelopment>> = [];
  try {
    [definitions, managers] = await Promise.all([
      poolManagerGrowthService.listAchievementDefinitions(),
      poolManagerGrowthService.listManagersForDevelopment(),
    ]);
  } catch {
    definitions = [];
    managers = [];
  }

  return (
    <AdminPoolManagersShell
      title="Manager Achievements"
      description="Award achievements by the RyvonX Governance Committee. Achievements appear on public manager profiles."
    >
      <AdminAchievementsPanel
        definitions={definitions}
        managers={managers.map((m) => ({ id: m.id, displayName: m.displayName }))}
      />
    </AdminPoolManagersShell>
  );
}
