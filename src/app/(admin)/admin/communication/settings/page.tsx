import { CommunicationCenterShell } from "@/features/admin/components/communication-center/communication-center-shell";
import { AdminCommunicationSettingsView } from "@/features/admin/components/communication-center/admin-communication-settings-view";
import { communicationCenterService } from "@/services/communication";
import { telegramConfigService } from "@/services/communication/telegram/telegram-config.service";

export default async function AdminCommunicationSettingsPage() {
  const [settings, telegram] = await Promise.all([
    communicationCenterService.getSettings(),
    telegramConfigService.getAdminConfig(),
  ]);
  return (
    <CommunicationCenterShell title="Settings" description="Configure Communication Center delivery and channel integrations.">
      <AdminCommunicationSettingsView initialSettings={settings} initialTelegram={telegram} />
    </CommunicationCenterShell>
  );
}
