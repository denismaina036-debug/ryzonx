import { CommunicationCenterShell } from "@/features/admin/components/communication-center/communication-center-shell";
import { AdminCommunicationSettingsView } from "@/features/admin/components/communication-center/admin-communication-settings-view";
import { communicationCenterService } from "@/services/communication";

export default async function AdminCommunicationSettingsPage() {
  let settings: Record<string, unknown> = {};
  try {
    settings = await communicationCenterService.getSettings();
  } catch {
    settings = {};
  }

  return (
    <CommunicationCenterShell
      title="Communication Settings"
      description="Configure sender details, support email, footer, branding, social links, and notification defaults."
    >
      <AdminCommunicationSettingsView initialSettings={settings} />
    </CommunicationCenterShell>
  );
}
