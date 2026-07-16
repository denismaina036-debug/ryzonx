import { CommunicationCenterShell } from "@/features/admin/components/communication-center/communication-center-shell";
import { AdminCommunicationCampaignsView } from "@/features/admin/components/communication-center/admin-communication-campaigns-view";
import { campaignCenterService } from "@/services/communication";

export default async function AdminCommunicationCampaignsPage() {
  let campaigns: Awaited<ReturnType<typeof campaignCenterService.list>> = [];
  try {
    campaigns = await campaignCenterService.list();
  } catch {
    campaigns = [];
  }

  return (
    <CommunicationCenterShell
      title="Campaigns"
      description="Prepare newsletters, investment tips, pool reports, and marketing campaigns with scheduling and analytics."
    >
      <AdminCommunicationCampaignsView initialCampaigns={campaigns} />
    </CommunicationCenterShell>
  );
}
