import type { Metadata } from "next";
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
import { LandingCtaBanner } from "@/features/public/components/landing-cta-banner";
import { landingPageService } from "@/services/landing-page.service";

export async function generateMetadata(): Promise<Metadata> {
  const content = await landingPageService.getPublicContent();
  const { seo } = content;
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords.split(",").map((k) => k.trim()).filter(Boolean),
    openGraph: {
      title: seo.title,
      description: seo.description,
      images: seo.openGraphImageUrl ? [{ url: seo.openGraphImageUrl }] : undefined,
    },
    icons: seo.faviconUrl ? { icon: seo.faviconUrl } : undefined,
  };
}

export default async function HomePage() {
  const [{ mockPerformanceHistory }, content] = await Promise.all([
    import("@/lib/mock-data"),
    landingPageService.getPublicContent(),
  ]);
  const { sections } = content;

  return (
    <>
      {sections.hero ? <HeroSection /> : null}
      {sections.performance ? (
        <PerformanceSection allData={mockPerformanceHistory} />
      ) : null}
      {sections.journal ? <JournalPreviewSection /> : null}
      {sections.recentActivity ? <ActivitySections /> : null}
      {sections.statistics ? <InvestorStatsSection /> : null}
      {sections.howItWorks ? <HowItWorksSection /> : null}
      {sections.whyRyvonx ? <WhyRyvonxSection /> : null}
      {sections.testimonials ? <TestimonialsSection /> : null}
      {sections.faq ? <FaqPreviewSection /> : null}
      {sections.ctaBanner ? <LandingCtaBanner /> : null}
      {sections.contact ? <ContactSection /> : null}
    </>
  );
}
