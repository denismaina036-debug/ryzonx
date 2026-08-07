import { CommunicationCenterShell } from "@/features/admin/components/communication-center/communication-center-shell";
import { AdminCommunicationCampaignsView } from "@/features/admin/components/communication-center/admin-communication-campaigns-view";

export default function AdminCommunicationCampaignsPage() {
  return (
    <CommunicationCenterShell
      title="Pool Manager Campaigns"
      description="Review, approve, and publish pool manager campaign submissions."
    >
      <AdminCommunicationCampaignsView />
    </CommunicationCenterShell>
  );
}
