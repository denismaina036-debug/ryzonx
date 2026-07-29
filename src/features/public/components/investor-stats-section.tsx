import { SectionContainer, SectionHeader } from "@/components/layouts/section";
import { landingPageService } from "@/services/landing-page.service";
import {
  LandingStatisticsDisplay,
  landingStatGridColumns,
  mapResolvedLandingStats,
} from "@/features/public/components/landing-statistics-display";

export async function InvestorStatsSection() {
  const content = await landingPageService.getPublicContent();
  const { copy, statistics } = content;

  const stats = mapResolvedLandingStats(statistics);
  const columns = landingStatGridColumns(statistics.length);

  return (
    <SectionContainer landingMobile>
      <SectionHeader
        badge={copy.statistics.badge}
        title={copy.statistics.title}
        description={copy.statistics.description}
        align="center"
        compactMobile
      />
      <LandingStatisticsDisplay stats={stats} columns={columns} />
    </SectionContainer>
  );
}
