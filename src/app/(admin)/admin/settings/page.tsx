import { AdminPageHeader, SettingsForm } from "@/features/admin/components";
import { AdminInvestmentLevelsManager } from "@/features/admin/components/admin-investment-levels-manager";
import { adminService } from "@/services/admin.service";
import { MegaPaySettingsCard } from "@/features/admin/components/megapay-settings-card";
import { paymentProviderConfigService } from "@/services/payment-provider-config.service";

export default async function AdminSettingsPage() {
  const [settings, megaPayConfig] = await Promise.all([
    adminService.getPlatformSettings(),
    paymentProviderConfigService.getAdminConfig(),
  ]);

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Global Settings"
        description="Configure company branding, contact info, investment limits, regional settings, and integrations."
      />
      <MegaPaySettingsCard initialConfig={megaPayConfig} />
      <AdminInvestmentLevelsManager />
      <SettingsForm settings={settings} />
    </div>
  );
}
