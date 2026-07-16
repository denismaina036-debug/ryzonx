import { CommunicationCenterShell } from "@/features/admin/components/communication-center/communication-center-shell";
import { AdminCommunicationBroadcastsView } from "@/features/admin/components/communication-center/admin-communication-broadcasts-view";
import { broadcastCenterService } from "@/services/communication";

export default async function AdminCommunicationBroadcastsPage() {
  let broadcasts: Awaited<ReturnType<typeof broadcastCenterService.list>> = [];
  try {
    broadcasts = await broadcastCenterService.list();
  } catch {
    broadcasts = [];
  }

  return (
    <CommunicationCenterShell
      title="Broadcasts"
      description="Send bulk communications to investors, pool managers, or specific audiences with scheduling and tracking."
    >
      <AdminCommunicationBroadcastsView initialBroadcasts={broadcasts} />
    </CommunicationCenterShell>
  );
}
