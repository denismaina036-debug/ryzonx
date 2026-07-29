"use client";

import { StatCard, StatGrid } from "@/components/ui/stat-card";
import type { LandingStatIcon, ResolvedLandingStat } from "@/domain/landing-page/types";
import { resolveLandingIcon } from "@/domain/landing-page/icons";
import {
  MobileStatCarousel,
  chunkStatSlides,
} from "@/features/public/components/mobile-stat-carousel";

export interface LandingStatDisplayItem {
  id: string;
  label: string;
  value: string;
  icon: LandingStatIcon;
  changeType?: "positive" | "negative" | "neutral";
}

export function mapResolvedLandingStats(
  statistics: ResolvedLandingStat[]
): LandingStatDisplayItem[] {
  return statistics.map((stat) => ({
    id: stat.id,
    label: stat.title,
    value: stat.resolvedValue,
    icon: stat.icon,
    changeType:
      stat.changeType ??
      (stat.automaticKey === "average_roi" ? "positive" : undefined),
  }));
}

export function landingStatGridColumns(count: number): 2 | 3 | 4 | 6 {
  if (count <= 3) return 3;
  if (count <= 4) return 4;
  return 6;
}

interface LandingStatisticsDisplayProps {
  stats: LandingStatDisplayItem[];
  columns: 2 | 3 | 4 | 6;
}

export function LandingStatisticsDisplay({
  stats,
  columns,
}: LandingStatisticsDisplayProps) {
  const slides = chunkStatSlides(stats, 4);

  return (
    <>
      <MobileStatCarousel className="md:hidden">
        {slides.map((slideStats, slideIndex) => (
          <div
            key={`slide-${slideIndex}`}
            className="grid auto-rows-fr grid-cols-2 gap-2.5"
          >
            {slideStats.map((stat) => (
              <StatCard
                key={stat.id}
                label={stat.label}
                value={stat.value}
                icon={resolveLandingIcon(stat.icon)}
                changeType={stat.changeType}
                compact
                className="h-full min-h-[6.75rem]"
              />
            ))}
          </div>
        ))}
      </MobileStatCarousel>

      <StatGrid columns={columns} className="hidden md:grid">
        {stats.map((stat) => (
          <StatCard
            key={stat.id}
            label={stat.label}
            value={stat.value}
            icon={resolveLandingIcon(stat.icon)}
            changeType={stat.changeType}
            className="h-full"
          />
        ))}
      </StatGrid>
    </>
  );
}
