import { notFound } from "next/navigation";
import { AdminLegalDocumentEditor } from "@/features/admin/components/admin-legal-document-editor";
import { isLegalDocumentType } from "@/domain/legal-documents/defaults";
import { legalDocumentService } from "@/services/legal-document.service";

interface AdminLegalDocumentPageProps {
  params: Promise<{ type: string }>;
}

export default async function AdminLegalDocumentPage({ params }: AdminLegalDocumentPageProps) {
  const { type } = await params;
  if (!isLegalDocumentType(type)) notFound();

  const [document, versions] = await Promise.all([
    legalDocumentService.getAdminDocument(type),
    legalDocumentService.listVersions(type),
  ]);

  return (
    <AdminLegalDocumentEditor
      documentType={type}
      initialDocument={document}
      initialVersions={versions}
    />
  );
}
