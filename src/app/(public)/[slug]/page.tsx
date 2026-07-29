import type { Metadata } from "next";
import { buildLegalSlugMetadata, renderLegalSlugPage } from "@/lib/legal/public-page";

interface LegalDynamicPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: LegalDynamicPageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildLegalSlugMetadata(slug);
}

export default async function LegalDynamicPage({ params }: LegalDynamicPageProps) {
  const { slug } = await params;
  return renderLegalSlugPage(slug);
}
