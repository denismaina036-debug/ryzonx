import { CommunicationCenterShell } from "@/features/admin/components/communication-center/communication-center-shell";
import { AdminCommunicationSearchView } from "@/features/admin/components/communication-center/admin-communication-search-view";

export default function AdminCommunicationSearchPage() {
  return (
    <CommunicationCenterShell
      title="Global Search"
      description="Search recipients, emails, templates, announcements, broadcasts, support tickets, and communication IDs."
    >
      <AdminCommunicationSearchView />
    </CommunicationCenterShell>
  );
}
