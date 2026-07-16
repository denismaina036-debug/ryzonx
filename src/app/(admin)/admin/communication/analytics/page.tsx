import { CommunicationCenterShell } from "@/features/admin/components/communication-center/communication-center-shell";
import { AdminCommunicationAnalyticsView } from "@/features/admin/components/communication-center/admin-communication-analytics-view";
import { communicationCenterService } from "@/services/communication";

export default async function AdminCommunicationAnalyticsPage() {
  let data = null;
  try {
    data = await communicationCenterService.getAnalytics();
  } catch {
    data = null;
  }

  return (
    <CommunicationCenterShell
      title="Analytics"
      description="Delivery rates, open rates, template usage, support metrics, and communication trends."
    >
      <AdminCommunicationAnalyticsView initialData={data} />
    </CommunicationCenterShell>
  );
}
