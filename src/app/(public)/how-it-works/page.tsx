import type { Metadata } from "next";
import { PageHeader } from "@/components/layouts/page-header";
import { SectionContainer } from "@/components/layouts/section";
import { HowItWorksSection } from "@/features/public/components/how-it-works-section";
import { WhyRyvonxSection } from "@/features/public/components/why-ryvonx-section";

export const metadata: Metadata = {
  title: "How It Works",
  description: "Learn how to invest in the Ryvonx Main Pool in four simple steps.",
};

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
