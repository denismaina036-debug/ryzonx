import { CommunicationCenterShell } from "@/features/admin/components/communication-center/communication-center-shell";
import { AdminCommunicationDashboard } from "@/features/admin/components/admin-communication-dashboard";
import { communicationCenterService } from "@/services/communication";

export default async function AdminCommunicationDashboardPage() {
  let stats = null;
  try {
    stats = await communicationCenterService.getEnterpriseDashboard();
  } catch {
    stats = null;
  }

  return (
    <CommunicationCenterShell
      title="Communication Dashboard"
      description="Complete overview of emails, notifications, support, broadcasts, and platform communication activity."
    >
      <AdminCommunicationDashboard initialStats={stats} />
    </CommunicationCenterShell>
  );
}
