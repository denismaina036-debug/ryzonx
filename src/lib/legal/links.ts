import type { LegalDocumentLink } from "@/domain/legal-documents/types";
import { LEGAL_DOCUMENT_TYPES } from "@/domain/legal-documents/types";
import { unstable_cache } from "next/cache";

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

const loadLegalLinks = unstable_cache(async (): Promise<LegalDocumentLink[]> => {
  try {
    const { legalDocumentService } = await import("@/services/legal-document.service");
    const links = await legalDocumentService.getPublicLinks();
    return links.length > 0 ? links : FALLBACK_LEGAL_LINKS;
  } catch {
    return FALLBACK_LEGAL_LINKS;
  }
}, ["public-legal-links"], { revalidate: 300, tags: ["legal-links"] });

export async function getLegalLinksSafe(): Promise<LegalDocumentLink[]> {
  return loadLegalLinks();
}
