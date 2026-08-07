import { CommunicationCenterShell } from "@/features/admin/components/communication-center/communication-center-shell";
import { AdminSupportInbox } from "@/features/admin/components";
import { supportService } from "@/services/support.service";

export default async function AdminCommunicationSupportPage() {
  const tickets = await supportService.getAdminTickets();

  return (
    <CommunicationCenterShell
      title="Support"
      description="Manage investor support tickets and conversations."
    >
      <AdminSupportInbox tickets={tickets} />
    </CommunicationCenterShell>
  );
}
