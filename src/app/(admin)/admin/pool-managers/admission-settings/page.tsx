import { AdminPageHeader } from "@/features/admin/components";
import { AdminPmAdmissionSettingsForm } from "@/features/admin/components/admin-pm-admission-settings";
import { pmAdmissionSettingsService } from "@/services/pm-admission-settings.service";

export default async function AdminPmAdmissionSettingsPage() {
  const settings = await pmAdmissionSettingsService.get();

  return (
    <div>
      <AdminPageHeader
        title="Pool Manager Admission"
        description="Configure admission fees, challenge rules, and evaluation criteria."
      />
      <AdminPmAdmissionSettingsForm initialSettings={settings} />
    </div>
  );
}
