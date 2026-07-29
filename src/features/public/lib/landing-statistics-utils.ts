import type { LandingStatIcon, ResolvedLandingStat } from "@/domain/landing-page/types";

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
