import type { Metadata } from "next";
import { LEGAL_DOCUMENT_TYPES } from "@/domain/legal-documents/types";
import { buildLegalTypeMetadata, renderLegalTypePage } from "@/lib/legal/public-page";

export async function generateMetadata(): Promise<Metadata> {
  return buildLegalTypeMetadata(LEGAL_DOCUMENT_TYPES.PRIVACY_POLICY);
}

export default async function PrivacyPage() {
  return renderLegalTypePage(LEGAL_DOCUMENT_TYPES.PRIVACY_POLICY, "privacy");
}
