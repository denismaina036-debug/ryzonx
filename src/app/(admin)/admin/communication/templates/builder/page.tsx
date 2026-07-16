import { CommunicationCenterShell } from "@/features/admin/components/communication-center/communication-center-shell";
import { EmailBuilderView } from "@/features/admin/components/communication-center/email-builder";

export default function AdminCommunicationBuilderPage() {
  return (
    <CommunicationCenterShell
      title="Visual Email Builder"
      description="Assemble emails from reusable content blocks with drag-and-drop, variables, and live preview."
    >
      <EmailBuilderView />
    </CommunicationCenterShell>
  );
}
