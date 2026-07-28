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
    <div className="flex flex-col">
      {sections.hero ? (
        <div className="order-1">
          <HeroSection />
        </div>
      ) : null}
      {sections.statistics ? (
        <div className="order-2 md:order-5">
          <InvestorStatsSection />
        </div>
      ) : null}
      {sections.performance ? (
        <div className="order-3 md:order-2">
          <PerformanceSection allData={mockPerformanceHistory} />
        </div>
      ) : null}
      {sections.journal ? (
        <div className="order-4 md:order-3">
          <JournalPreviewSection />
        </div>
      ) : null}
      {sections.recentActivity ? (
        <div className="order-5 md:order-4">
          <ActivitySections />
        </div>
      ) : null}
      {sections.howItWorks ? (
        <div className="order-6">
          <HowItWorksSection />
        </div>
      ) : null}
      {sections.whyRyvonx ? (
        <div className="order-7">
          <WhyRyvonxSection />
        </div>
      ) : null}
      {sections.testimonials ? (
        <div className="order-8">
          <TestimonialsSection />
        </div>
      ) : null}
      {sections.faq ? (
        <div className="order-9">
          <FaqPreviewSection />
        </div>
      ) : null}
      {sections.ctaBanner ? (
        <div className="order-10">
          <LandingCtaBanner />
        </div>
      ) : null}
      {sections.contact ? (
        <div className="order-11">
          <ContactSection />
        </div>
      ) : null}
    </div>
  );
}
