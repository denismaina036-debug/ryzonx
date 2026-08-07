import { CommunicationCenterShell } from "@/features/admin/components/communication-center/communication-center-shell";
import { AdminCommunicationNotificationsView } from "@/features/admin/components/communication-center/admin-communication-notifications-view";

export default function AdminCommunicationNotificationsPage() {
  return (
    <CommunicationCenterShell
      title="Notifications"
      description="Review delivery history for platform notifications."
    >
      <AdminCommunicationNotificationsView />
    </CommunicationCenterShell>
  );
}
