import { CommunicationCenterShell } from "@/features/admin/components/communication-center/communication-center-shell";
import { AdminCommunicationTemplatesView } from "@/features/admin/components/admin-communication-templates-view";
import { emailTemplateService } from "@/services/communication";

export default async function AdminCommunicationTemplatesPage() {
  let templates: Awaited<ReturnType<typeof emailTemplateService.listTemplates>> = [];
  try {
    templates = await emailTemplateService.listTemplates();
  } catch {
    templates = [];
  }

  return (
    <CommunicationCenterShell
      title="Email Templates"
      description="Create, edit, preview, version, and test every email template — no HTML editing required."
    >
      <AdminCommunicationTemplatesView initialTemplates={templates} />
    </CommunicationCenterShell>
  );
}
