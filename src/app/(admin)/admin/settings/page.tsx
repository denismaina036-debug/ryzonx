import { AdminPageHeader, SettingsForm } from "@/features/admin/components";
import { AdminInvestmentLevelsManager } from "@/features/admin/components/admin-investment-levels-manager";
import { adminService } from "@/services/admin.service";

export default async function AdminSettingsPage() {
  const settings = await adminService.getPlatformSettings();

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Global Settings"
        description="Configure company branding, contact info, investment limits, regional settings, and integrations."
      />
      <AdminInvestmentLevelsManager />
      <SettingsForm settings={settings} />
    </div>
  );
}
