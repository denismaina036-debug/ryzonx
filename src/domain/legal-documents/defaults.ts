import type { LegalDocumentType, LegalSection } from "@/domain/legal-documents/types";
import { LEGAL_DOCUMENT_TYPES } from "@/domain/legal-documents/types";

function section(id: string, title: string, sortOrder: number): LegalSection {
  return {
    id,
    title,
    sortOrder,
    content: `<p>This section outlines ${title.toLowerCase()} for the RyvonX platform. Administrators can edit this content at any time.</p>`,
  };
}

const TERMS_SECTION_TITLES = [
  "Introduction",
  "Definitions",
  "Eligibility",
  "User Accounts",
  "Identity Verification (KYC)",
  "Platform Services",
  "Investor Responsibilities",
  "Pool Manager Responsibilities",
  "Investment Risks",
  "Wallets, Deposits & Withdrawals",
  "Fees",
  "Investment Cycles & Settlements",
  "Prohibited Activities",
  "Account Suspension & Termination",
  "Intellectual Property",
  "Limitation of Liability",
  "Indemnification",
  "Changes to these Terms",
  "Governing Law",
  "Contact Information",
] as const;

const PRIVACY_SECTION_TITLES = [
  "Introduction",
  "Information We Collect",
  "How We Use Information",
  "Cookies",
  "Information Sharing",
  "Data Security",
  "Data Retention",
  "User Rights",
  "Marketing Communications",
  "International Data Transfers",
  "Children's Privacy",
  "Policy Updates",
  "Contact Information",
] as const;

function buildDefaultSections(prefix: string, titles: readonly string[]): LegalSection[] {
  return titles.map((title, index) =>
    section(`${prefix}-${index + 1}`, title, index)
  );
}

export const DEFAULT_TERMS_SECTIONS = buildDefaultSections("terms", TERMS_SECTION_TITLES);
export const DEFAULT_PRIVACY_SECTIONS = buildDefaultSections("privacy", PRIVACY_SECTION_TITLES);

export const LEGAL_DOCUMENT_LABELS: Record<LegalDocumentType, string> = {
  [LEGAL_DOCUMENT_TYPES.TERMS_OF_SERVICE]: "Terms of Service",
  [LEGAL_DOCUMENT_TYPES.PRIVACY_POLICY]: "Privacy Policy",
};

export const DEFAULT_LEGAL_SEO: Record<
  LegalDocumentType,
  {
    pageTitle: string;
    metaDescription: string;
    metaKeywords: string;
    slug: string;
    ogImageUrl: string;
  }
> = {
  [LEGAL_DOCUMENT_TYPES.TERMS_OF_SERVICE]: {
    pageTitle: "Terms of Service | RyvonX",
    metaDescription:
      "Read the RyvonX Terms of Service governing investor accounts, pool participation, wallets, and platform use.",
    metaKeywords: "RyvonX, terms of service, legal, investor agreement",
    slug: "terms",
    ogImageUrl: "",
  },
  [LEGAL_DOCUMENT_TYPES.PRIVACY_POLICY]: {
    pageTitle: "Privacy Policy | RyvonX",
    metaDescription:
      "Learn how RyvonX collects, uses, and protects your personal information and platform data.",
    metaKeywords: "RyvonX, privacy policy, data protection, personal information",
    slug: "privacy",
    ogImageUrl: "",
  },
};

export function getDefaultSections(documentType: LegalDocumentType): LegalSection[] {
  return documentType === LEGAL_DOCUMENT_TYPES.TERMS_OF_SERVICE
    ? DEFAULT_TERMS_SECTIONS.map((section) => ({ ...section }))
    : DEFAULT_PRIVACY_SECTIONS.map((section) => ({ ...section }));
}

export function isLegalDocumentType(value: string): value is LegalDocumentType {
  return (
    value === LEGAL_DOCUMENT_TYPES.TERMS_OF_SERVICE ||
    value === LEGAL_DOCUMENT_TYPES.PRIVACY_POLICY
  );
}
