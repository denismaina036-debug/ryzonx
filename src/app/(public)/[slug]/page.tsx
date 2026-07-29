import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  buildLegalSlugMetadata,
  getPublishedLegalDocumentBySlug,
} from "@/lib/legal/public-page";
import { LegalDocumentView } from "@/features/public/components/legal-document-view";

interface LegalDynamicPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: LegalDynamicPageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildLegalSlugMetadata(slug);
}

export default async function LegalDynamicPage({ params }: LegalDynamicPageProps) {
  const { slug } = await params;
  const document = await getPublishedLegalDocumentBySlug(slug);
  if (!document) notFound();
  return <LegalDocumentView document={document} />;
}
