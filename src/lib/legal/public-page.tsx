import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LegalDocumentView } from "@/features/public/components/legal-document-view";
import { legalDocumentService } from "@/services/legal-document.service";
import type { LegalDocumentType, PublishedLegalDocument } from "@/domain/legal-documents/types";

export async function getPublishedLegalDocumentBySlug(
  slug: string
): Promise<PublishedLegalDocument | null> {
  return legalDocumentService.getPublishedBySlug(slug);
}

export async function getPublishedLegalDocumentByType(
  documentType: LegalDocumentType
): Promise<PublishedLegalDocument | null> {
  return legalDocumentService.getPublishedByType(documentType);
}

export function buildLegalDocumentMetadata(document: PublishedLegalDocument): Metadata {
  return {
    title: document.seo.pageTitle,
    description: document.seo.metaDescription,
    keywords: document.seo.metaKeywords,
    openGraph: {
      title: document.seo.pageTitle,
      description: document.seo.metaDescription,
      images: document.seo.ogImageUrl ? [document.seo.ogImageUrl] : undefined,
    },
  };
}

export async function renderPublishedLegalSlugPage(slug: string) {
  const document = await getPublishedLegalDocumentBySlug(slug);
  if (!document) notFound();
  return <LegalDocumentView document={document} />;
}

export async function renderPublishedLegalTypePage(
  documentType: LegalDocumentType,
  legacySlug: string
) {
  const document = await getPublishedLegalDocumentByType(documentType);
  if (!document) notFound();
  if (document.seo.slug !== legacySlug) {
    redirect(`/${document.seo.slug}`);
  }
  return <LegalDocumentView document={document} />;
}

export async function buildLegalSlugMetadata(slug: string): Promise<Metadata> {
  const document = await getPublishedLegalDocumentBySlug(slug);
  if (!document) return { title: "Legal Document" };
  return buildLegalDocumentMetadata(document);
}

export async function buildLegalTypeMetadata(
  documentType: LegalDocumentType
): Promise<Metadata> {
  const document = await getPublishedLegalDocumentByType(documentType);
  if (!document) return { title: "Legal Document" };
  return buildLegalDocumentMetadata(document);
}
