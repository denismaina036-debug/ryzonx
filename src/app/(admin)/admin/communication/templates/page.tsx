import { CommunicationCenterShell } from "@/features/admin/components/communication-center/communication-center-shell";
import { AdminCommunicationTemplatesView } from "@/features/admin/components/admin-communication-templates-view";
import { emailTemplateService } from "@/services/communication/email-template.service";

export default async function AdminCommunicationTemplatesPage() {
  const templates = await emailTemplateService.listTemplates();

  return (
    <CommunicationCenterShell
      title="Automated Messages"
      description="Review and edit the message details used by RyvonX platform automations."
    >
      <AdminCommunicationTemplatesView initialTemplates={templates} />
    </CommunicationCenterShell>
  );
}
