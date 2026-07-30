import type { Metadata } from "next";
import { PageHeader } from "@/components/layouts/page-header";
import { SectionContainer } from "@/components/layouts/section";
import { PerformanceSection } from "@/features/public/components/performance-section";
import { LandingStatisticsDisplay } from "@/features/public/components/landing-statistics-display";
import {
  landingStatGridColumns,
  mapResolvedLandingStats,
} from "@/features/public/lib/landing-statistics-utils";
import { ROUTES } from "@/constants/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { landingPageService } from "@/services/landing-page.service";
import { mockPerformanceHistory } from "@/lib/mock-data";

export const metadata: Metadata = buildPageMetadata({
  title: "Performance",
  description:
    "View RyvonX historical performance, ROI metrics, and fund statistics with full transparency.",
  path: ROUTES.performance,
  keywords: ["fund performance", "ROI", "trading performance", "RyvonX"],
});

export default async function PerformancePage() {
  const content = await landingPageService.getPublicContent();
  const heroStats = mapResolvedLandingStats(content.heroStats);
  const statistics = mapResolvedLandingStats(content.statistics);

  return (
    <>
      <SectionContainer className="!pb-8 !pt-8">
        <PageHeader
          title="Fund Performance"
          description="Complete transparency into Ryvonx Main Pool performance metrics and historical data."
        />
        {heroStats.length > 0 ? (
          <LandingStatisticsDisplay
            stats={heroStats}
            columns={landingStatGridColumns(heroStats.length)}
          />
        ) : null}
      </SectionContainer>

      <PerformanceSection allData={mockPerformanceHistory} className="!pt-0" />

      {statistics.length > 0 ? (
        <SectionContainer>
          <LandingStatisticsDisplay
            stats={statistics}
            columns={landingStatGridColumns(statistics.length)}
          />
        </SectionContainer>
      ) : null}
    </>
  );
}
