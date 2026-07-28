import { SectionContainer, SectionHeader } from "@/components/layouts/section";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { landingPageService } from "@/services/landing-page.service";
import { resolveLandingIcon } from "@/domain/landing-page/icons";

export async function InvestorStatsSection() {
  const content = await landingPageService.getPublicContent();
  const { copy, statistics } = content;

  return (
    <SectionContainer>
      <SectionHeader
        badge={copy.statistics.badge}
        title={copy.statistics.title}
        description={copy.statistics.description}
        align="center"
      />
      <StatGrid columns={statistics.length <= 4 ? (statistics.length <= 3 ? 3 : 4) : 6}>
        {statistics.map((stat) => (
          <StatCard
            key={stat.id}
            label={stat.title}
            value={stat.resolvedValue}
            icon={resolveLandingIcon(stat.icon)}
            changeType={stat.automaticKey === "average_roi" ? "positive" : undefined}
          />
        ))}
      </StatGrid>
    </SectionContainer>
  );
}
