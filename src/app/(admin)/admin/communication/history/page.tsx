import { CommunicationCenterShell } from "@/features/admin/components/communication-center/communication-center-shell";
import { AdminCommunicationHistoryView } from "@/features/admin/components/admin-communication-history-view";

export default function AdminCommunicationHistoryPage() {
  return (
    <CommunicationCenterShell
      title="Communication History"
      description="Permanent audit trail of every email, notification, broadcast, and support message. Nothing is deleted."
    >
      <AdminCommunicationHistoryView />
    </CommunicationCenterShell>
  );
}
