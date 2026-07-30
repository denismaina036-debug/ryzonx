import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LegalDocumentView } from "@/features/public/components/legal-document-view";
import { legalDocumentService } from "@/services/legal-document.service";
import type { LegalDocumentType, PublishedLegalDocument } from "@/domain/legal-documents/types";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export async function getPublishedLegalDocumentBySlug(
  slug: string
): Promise<PublishedLegalDocument | null> {
  return legalDocumentService.getPublishedBySlug(slug);
}

export async function getPublishedLegalDocumentByType(
  documentType: LegalDocumentType
): Promise<PublishedLegalDocument> {
  return legalDocumentService.getPublishedByType(documentType);
}

export function buildLegalDocumentMetadata(document: PublishedLegalDocument): Metadata {
  const keywords = document.seo.metaKeywords
    ? document.seo.metaKeywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
    : undefined;

  return buildPageMetadata({
    title: document.seo.pageTitle,
    description: document.seo.metaDescription,
    path: `/${document.seo.slug}`,
    keywords,
    image: document.seo.ogImageUrl || undefined,
  });
}

export async function buildLegalSlugMetadata(slug: string): Promise<Metadata> {
  try {
    const document = await getPublishedLegalDocumentBySlug(slug);
    if (!document) return { title: "Legal Document" };
    return buildLegalDocumentMetadata(document);
  } catch (error) {
    console.error("[legal-page] buildLegalSlugMetadata failed:", error);
    return { title: "Legal Document" };
  }
}

export async function buildLegalTypeMetadata(
  documentType: LegalDocumentType
): Promise<Metadata> {
  try {
    const document = await getPublishedLegalDocumentByType(documentType);
    return buildLegalDocumentMetadata(document);
  } catch (error) {
    console.error("[legal-page] buildLegalTypeMetadata failed:", error);
    return { title: "Legal Document" };
  }
}

export async function renderLegalTypePage(
  documentType: LegalDocumentType,
  legacySlug: string
) {
  const document = await getPublishedLegalDocumentByType(documentType);
  if (document.seo.slug !== legacySlug) {
    redirect(`/${document.seo.slug}`);
  }
  return <LegalDocumentView document={document} />;
}

export async function renderLegalSlugPage(slug: string) {
  const document = await getPublishedLegalDocumentBySlug(slug);
  if (!document) notFound();
  return <LegalDocumentView document={document} />;
}
