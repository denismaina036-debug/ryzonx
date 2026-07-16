import { CommunicationCenterShell } from "@/features/admin/components/communication-center/communication-center-shell";
import { AdminCommunicationInboxView } from "@/features/admin/components/communication-center/admin-communication-inbox-view";
import { communicationCenterService } from "@/services/communication";

export default async function AdminCommunicationInboxPage() {
  let items: Awaited<ReturnType<typeof communicationCenterService.listInbox>> = [];
  try {
    items = await communicationCenterService.listInbox();
  } catch {
    items = [];
  }

  return (
    <CommunicationCenterShell
      title="Inbox"
      description="Every incoming conversation — support tickets and platform messages in one premium help desk."
    >
      <AdminCommunicationInboxView initialItems={items} />
    </CommunicationCenterShell>
  );
}
