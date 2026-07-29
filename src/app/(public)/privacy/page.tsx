import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LEGAL_DOCUMENT_TYPES } from "@/domain/legal-documents/types";
import {
  buildLegalTypeMetadata,
  getPublishedLegalDocumentByType,
} from "@/lib/legal/public-page";
import { LegalDocumentView } from "@/features/public/components/legal-document-view";

export async function generateMetadata(): Promise<Metadata> {
  return buildLegalTypeMetadata(LEGAL_DOCUMENT_TYPES.PRIVACY_POLICY);
}

export default async function PrivacyPage() {
  const document = await getPublishedLegalDocumentByType(
    LEGAL_DOCUMENT_TYPES.PRIVACY_POLICY
  );
  if (!document) notFound();
  if (document.seo.slug !== "privacy") redirect(`/${document.seo.slug}`);
  return <LegalDocumentView document={document} />;
}
