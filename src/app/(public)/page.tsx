import type { Metadata } from "next";
import { BRAND_NAME } from "@/constants/brand";
import { ROUTES } from "@/constants/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { HeroSection } from "@/features/public/components/hero-section";
import { BrokerCompatibilitySection } from "@/features/public/components/broker-compatibility-section";
import { FeaturedPoolManagersSection } from "@/features/public/components/featured-pool-managers-section";
import { PerformanceSection } from "@/features/public/components/performance-section";
import { ActivitySections } from "@/features/public/components/activity-sections";
import { InvestorStatsSection } from "@/features/public/components/investor-stats-section";
import { HowItWorksSection } from "@/features/public/components/how-it-works-section";
import { WhyRyvonxSection } from "@/features/public/components/why-ryvonx-section";
import { TestimonialsSection } from "@/features/public/components/testimonials-section";
import { FaqPreviewSection } from "@/features/public/components/faq-preview";
import { ContactSection } from "@/features/public/components/contact-section";
import { LandingCtaBanner } from "@/features/public/components/landing-cta-banner";
import { landingPageService } from "@/services/landing-page.service";
import { TraderCapitalAccessSection } from "@/features/public/components/trader-capital-access-section";

export async function generateMetadata(): Promise<Metadata> {
  const content = await landingPageService.getPublicContent();
  const { seo } = content;
  const keywords = (typeof seo.keywords === "string" ? seo.keywords : "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  return buildPageMetadata({
    title: seo.title || BRAND_NAME,
    description: seo.description,
    path: ROUTES.home,
    keywords: keywords.length ? keywords : undefined,
    image: seo.openGraphImageUrl || seo.socialPreviewImageUrl || undefined,
    absoluteTitle: true,
  });
}

export default async function HomePage() {
  const [{ mockPerformanceHistory }, content] = await Promise.all([
    import("@/lib/mock-data"),
    landingPageService.getPublicContent(),
  ]);
  const { sections } = content;

  return (
    <div className="ryvonx-public-home flex w-full min-w-0 flex-col overflow-x-hidden">
      {sections.hero ? (
        <div className="order-1 w-full min-w-0">
          <HeroSection />
        </div>
      ) : null}
      <div className="order-2 w-full min-w-0">
        <section className="bg-white px-4 py-12 text-center sm:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">Marketplace</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-slate-950 sm:text-3xl">
            Find Your Investment Pool
          </h2>
          <div className="mx-auto mt-4 flex w-28 items-center gap-2" aria-hidden="true">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-blue-300" />
            <span className="h-2.5 w-2.5 rotate-45 border-2 border-blue-500" />
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-blue-300" />
          </div>
          <p className="mx-auto mt-4 max-w-xl text-sm text-slate-500 sm:text-base">
            Verified managers. Transparent strategies. Built for informed investing.
          </p>
        </section>
      </div>
      {sections.featuredPoolManagers ? (
        <div className="order-3 w-full min-w-0">
          <FeaturedPoolManagersSection />
        </div>
      ) : null}
      <div className="order-4 w-full min-w-0">
        <TraderCapitalAccessSection />
      </div>
      {sections.brokerCompatibility ? (
        <div className="order-5 w-full min-w-0">
          <BrokerCompatibilitySection />
        </div>
      ) : null}
      {sections.statistics ? (
        <div className="order-10 w-full min-w-0">
          <InvestorStatsSection />
        </div>
      ) : null}
      {sections.performance ? (
        <div className="order-6 w-full min-w-0">
          <PerformanceSection allData={mockPerformanceHistory} />
        </div>
      ) : null}
      {sections.recentActivity ? (
        <div className="order-8 w-full min-w-0">
          <ActivitySections />
        </div>
      ) : null}
      {sections.howItWorks ? (
        <div className="order-9 w-full min-w-0">
          <HowItWorksSection />
        </div>
      ) : null}
      {sections.whyRyvonx ? (
        <div className="order-11 w-full min-w-0">
          <WhyRyvonxSection />
        </div>
      ) : null}
      {sections.testimonials ? (
        <div className="order-12 w-full min-w-0">
          <TestimonialsSection />
        </div>
      ) : null}
      {sections.faq ? (
        <div className="order-13 w-full min-w-0">
          <FaqPreviewSection />
        </div>
      ) : null}
      {sections.ctaBanner ? (
        <div className="order-14 w-full min-w-0">
          <LandingCtaBanner />
        </div>
      ) : null}
      {sections.contact ? (
        <div className="order-15 w-full min-w-0">
          <ContactSection />
        </div>
      ) : null}
    </div>
  );
}
