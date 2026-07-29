import { AdminPageHeader } from "@/features/admin/components";
import { AdminLegalDocumentsList } from "@/features/admin/components/admin-legal-documents-list";
import { legalDocumentService } from "@/services/legal-document.service";

export default async function AdminLegalDocumentsPage() {
  const documents = await legalDocumentService.listAdminDocuments();

  return (
    <div>
      <AdminPageHeader
        title="Legal Documents"
        description="Manage Terms of Service and Privacy Policy with draft, preview, publish, and version history."
      />
      <AdminLegalDocumentsList documents={documents} />
    </div>
  );
}
