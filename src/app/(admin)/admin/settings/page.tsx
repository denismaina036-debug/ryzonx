import { AdminPageHeader, SettingsForm } from "@/features/admin/components";
import { adminService } from "@/services/admin.service";

export default async function AdminSettingsPage() {
  const settings = await adminService.getPlatformSettings();

  return (
    <div>
      <AdminPageHeader
        title="Global Settings"
        description="Configure company branding, contact info, investment limits, regional settings, and integrations."
      />
      <SettingsForm settings={settings} />
    </div>
  );
}
