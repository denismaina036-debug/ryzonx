import type { Metadata } from "next";
import { PageHeader } from "@/components/layouts/page-header";
import { SectionContainer } from "@/components/layouts/section";
import { HowItWorksSection } from "@/features/public/components/how-it-works-section";
import { WhyRyvonxSection } from "@/features/public/components/why-ryvonx-section";
import { ROUTES } from "@/constants/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "How It Works",
  description:
    "Learn how to discover investment pools, invest with verified traders, and track performance on RyvonX.",
  path: ROUTES.howItWorks,
  keywords: ["how RyvonX works", "invest in pools", "pool trading guide"],
});

export default function HowItWorksPage() {
  return (
    <>
      <SectionContainer className="!pb-0 !pt-8">
        <PageHeader
          title="How It Works"
          description="A straightforward process from account creation to profit tracking."
        />
      </SectionContainer>
      <HowItWorksSection className="!pt-8" />
      <WhyRyvonxSection />
    </>
  );
}
