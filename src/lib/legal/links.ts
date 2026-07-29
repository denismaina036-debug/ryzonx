import type { LegalDocumentLink } from "@/domain/legal-documents/types";
import { LEGAL_DOCUMENT_TYPES } from "@/domain/legal-documents/types";

export const FALLBACK_LEGAL_LINKS: LegalDocumentLink[] = [
  {
    documentType: LEGAL_DOCUMENT_TYPES.TERMS_OF_SERVICE,
    label: "Terms of Service",
    href: "/terms",
  },
  {
    documentType: LEGAL_DOCUMENT_TYPES.PRIVACY_POLICY,
    label: "Privacy Policy",
    href: "/privacy",
  },
];

export async function getLegalLinksSafe(): Promise<LegalDocumentLink[]> {
  try {
    const { legalDocumentService } = await import("@/services/legal-document.service");
    const links = await legalDocumentService.getPublicLinks();
    return links.length > 0 ? links : FALLBACK_LEGAL_LINKS;
  } catch (error) {
    console.error("[legal-links] Failed to load public legal links:", error);
    return FALLBACK_LEGAL_LINKS;
  }
}
