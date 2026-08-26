import { AdminPageHeader } from "@/features/admin/components";
import { AdminPmAdmissionSettingsForm } from "@/features/admin/components/admin-pm-admission-settings";
import { pmAdmissionSettingsService } from "@/services/pm-admission-settings.service";
import { pmAdmissionTierService } from "@/services/pm-admission-tier.service";
import { challengeTemplateService } from "@/services/challenge-template.service";
import { AdminPmAdmissionTiers } from "@/features/admin/components/admin-pm-admission-tiers";

export default async function AdminPmAdmissionSettingsPage() {
  const [settings, tiers, templates] = await Promise.all([
    pmAdmissionSettingsService.get(),
    pmAdmissionTierService.listAdmin(),
    challengeTemplateService.listAll(),
  ]);

  return (
    <div>
      <AdminPageHeader
        title="Pool Manager Admission"
        description="Configure admission fees, challenge rules, and evaluation criteria."
      />
      <div className="space-y-8">
        <AdminPmAdmissionTiers initialTiers={tiers} templates={templates.map(({ id, name }) => ({ id, name }))} />
        <AdminPmAdmissionSettingsForm initialSettings={settings} />
      </div>
    </div>
  );
}
