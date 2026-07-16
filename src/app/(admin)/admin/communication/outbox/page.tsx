import { CommunicationCenterShell } from "@/features/admin/components/communication-center/communication-center-shell";
import { AdminCommunicationOutboxView } from "@/features/admin/components/communication-center/admin-communication-outbox-view";
import { communicationCenterService } from "@/services/communication";

export default async function AdminCommunicationOutboxPage() {
  let items: Awaited<ReturnType<typeof communicationCenterService.listOutbox>> = [];
  try {
    items = await communicationCenterService.listOutbox();
  } catch {
    items = [];
  }

  return (
    <CommunicationCenterShell
      title="Outbox"
      description="Every communication sent through the platform — searchable, filterable, with delivery status."
    >
      <AdminCommunicationOutboxView initialRows={items as never} />
    </CommunicationCenterShell>
  );
}
