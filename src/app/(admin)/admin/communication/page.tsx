import { CommunicationCenterShell } from "@/features/admin/components/communication-center/communication-center-shell";
import { AdminCommunicationDashboard } from "@/features/admin/components/admin-communication-dashboard";
import { communicationCenterService } from "@/services/communication";

export default async function AdminCommunicationDashboardPage() {
  let stats = null;
  try {
    stats = await communicationCenterService.getOperationalDashboard();
  } catch {
    stats = null;
  }

  return (
    <CommunicationCenterShell
      title="Communication Centre"
      description="Operational overview for messages, pool manager campaigns, notifications, and support."
    >
      <AdminCommunicationDashboard initialStats={stats} />
    </CommunicationCenterShell>
  );
}
