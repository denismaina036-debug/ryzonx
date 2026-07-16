import { HeroSection } from "@/features/public/components/hero-section";
import { PerformanceSection } from "@/features/public/components/performance-section";
import { JournalPreviewSection } from "@/features/public/components/journal-preview";
import { ActivitySections } from "@/features/public/components/activity-sections";
import { InvestorStatsSection } from "@/features/public/components/investor-stats-section";
import { HowItWorksSection } from "@/features/public/components/how-it-works-section";
import { WhyRyvonxSection } from "@/features/public/components/why-ryvonx-section";
import { TestimonialsSection } from "@/features/public/components/testimonials-section";
import { FaqPreviewSection } from "@/features/public/components/faq-preview";
import { ContactSection } from "@/features/public/components/contact-section";

export default async function HomePage() {
  const { mockPerformanceHistory } = await import("@/lib/mock-data");

  return (
    <>
      <HeroSection />
      <PerformanceSection allData={mockPerformanceHistory} />
      <JournalPreviewSection />
      <ActivitySections />
      <InvestorStatsSection />
      <HowItWorksSection />
      <WhyRyvonxSection />
      <TestimonialsSection />
      <FaqPreviewSection />
      <ContactSection />
    </>
  );
}
