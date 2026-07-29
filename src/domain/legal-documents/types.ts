export const LEGAL_DOCUMENT_TYPES = {
  TERMS_OF_SERVICE: "terms_of_service",
  PRIVACY_POLICY: "privacy_policy",
} as const;

export type LegalDocumentType =
  (typeof LEGAL_DOCUMENT_TYPES)[keyof typeof LEGAL_DOCUMENT_TYPES];

export const LEGAL_DOCUMENT_STATUSES = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

export type LegalDocumentStatus =
  (typeof LEGAL_DOCUMENT_STATUSES)[keyof typeof LEGAL_DOCUMENT_STATUSES];

export interface LegalSection {
  id: string;
  title: string;
  content: string;
  sortOrder: number;
}

export interface LegalDocumentSeo {
  pageTitle: string;
  metaDescription: string;
  metaKeywords: string;
  slug: string;
  ogImageUrl: string;
}

export interface LegalDocumentDraft {
  documentType: LegalDocumentType;
  status: LegalDocumentStatus;
  publishedVersionNumber: number | null;
  seo: LegalDocumentSeo;
  sections: LegalSection[];
  updatedAt: string;
  updatedBy: string | null;
}

export interface LegalDocumentVersionSummary {
  id: string;
  versionNumber: number;
  pageTitle: string;
  slug: string;
  changeNotes: string | null;
  publishedBy: string | null;
  publishedByName: string | null;
  publishedAt: string;
}

export interface LegalDocumentVersionDetail extends LegalDocumentVersionSummary {
  sections: LegalSection[];
  metaDescription: string;
  metaKeywords: string;
  ogImageUrl: string;
}

export interface PublishedLegalDocument {
  documentType: LegalDocumentType;
  documentId: string;
  versionId: string;
  versionNumber: number;
  label: string;
  seo: LegalDocumentSeo;
  sections: LegalSection[];
  publishedAt: string;
}

export interface LegalDocumentLink {
  documentType: LegalDocumentType;
  label: string;
  href: string;
}

export interface PendingLegalAcceptance {
  documentType: LegalDocumentType;
  label: string;
  href: string;
  versionNumber: number;
  versionId: string;
  publishedAt: string;
}

export interface AdminLegalDocumentListItem {
  documentType: LegalDocumentType;
  label: string;
  status: LegalDocumentStatus;
  slug: string;
  publishedVersionNumber: number | null;
  updatedAt: string;
  hasDraftChanges: boolean;
}
