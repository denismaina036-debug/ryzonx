import { CommunicationCenterShell } from "@/features/admin/components/communication-center/communication-center-shell";
import { AdminSupportInbox } from "@/features/admin/components";
import { supportService } from "@/services/support.service";

export default async function AdminCommunicationSupportPage() {
  const tickets = await supportService.getAdminTickets();

  return (
    <CommunicationCenterShell
      title="Support Center"
      description="Enterprise-grade ticketing — manage open, pending, resolved, and closed tickets with full conversation history."
    >
      <AdminSupportInbox tickets={tickets} />
    </CommunicationCenterShell>
  );
}
