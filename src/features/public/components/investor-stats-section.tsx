import { SectionContainer, SectionHeader } from "@/components/layouts/section";
import { landingPageService } from "@/services/landing-page.service";
import {
  LandingStatisticsDisplay,
  type LandingStatDisplayItem,
} from "@/features/public/components/landing-statistics-display";

export async function InvestorStatsSection() {
  const content = await landingPageService.getPublicContent();
  const { copy, statistics } = content;

  const stats: LandingStatDisplayItem[] = statistics.map((stat) => ({
    id: stat.id,
    label: stat.title,
    value: stat.resolvedValue,
    icon: stat.icon,
    changeType: stat.automaticKey === "average_roi" ? "positive" : undefined,
  }));

  const columns =
    statistics.length <= 4 ? (statistics.length <= 3 ? 3 : 4) : 6;

  return (
    <SectionContainer landingMobile>
      <SectionHeader
        badge={copy.statistics.badge}
        title={copy.statistics.title}
        description={copy.statistics.description}
        align="center"
        compactMobile
      />
      <LandingStatisticsDisplay stats={stats} columns={columns as 2 | 3 | 4 | 6} />
    </SectionContainer>
  );
}
