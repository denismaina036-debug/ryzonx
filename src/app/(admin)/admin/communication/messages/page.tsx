import { CommunicationCenterShell } from "@/features/admin/components/communication-center/communication-center-shell";
import { AdminCommunicationMessagesView } from "@/features/admin/components/communication-center/admin-communication-messages-view";

export default function AdminCommunicationMessagesPage() {
  return (
    <CommunicationCenterShell
      title="Messages"
      description="Send and manage RyvonX communications."
    >
      <AdminCommunicationMessagesView />
    </CommunicationCenterShell>
  );
}
