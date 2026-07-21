import { AdminChallengeTemplates } from "@/features/admin/components/admin-challenge-templates";
import { AdminPoolManagersShell } from "@/features/admin/components/admin-pool-managers-shell";
import { challengeTemplateService } from "@/services/challenge-template.service";

export default async function AdminChallengeTemplatesPage() {
  const templates = await challengeTemplateService.listAll();

  return (
    <AdminPoolManagersShell
      title="Challenge Templates"
      description="Manage reusable evaluation rules assigned to Pool Manager challenge applicants."
    >
      <AdminChallengeTemplates initialTemplates={templates} />
    </AdminPoolManagersShell>
  );
}
