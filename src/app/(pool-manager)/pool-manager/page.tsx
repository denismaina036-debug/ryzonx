import { poolManagerWorkspaceService } from "@/services/pool-manager-workspace.service";
import { PmWorkspaceDashboard } from "@/features/pool-manager/components/workspace/pm-workspace-dashboard";

export default async function PoolManagerDashboardPage() {
  const data = await poolManagerWorkspaceService.getDashboard();
  return <PmWorkspaceDashboard data={data} />;
}
