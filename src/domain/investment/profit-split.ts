import type { PlatformInvestmentLevel } from "@/domain/roi/types";

/** Display-only profit split. Distribution and ownership calculations must not read this. */
export interface CycleProfitSplit {
  investmentLevelId: string;
  traderPct: number;
  copierPct: number;
}

export function defaultCycleProfitSplits(
  levels: Pick<PlatformInvestmentLevel, "id">[]
): CycleProfitSplit[] {
  return levels.map((level) => ({
    investmentLevelId: level.id,
    traderPct: 50,
    copierPct: 50,
  }));
}

export function validateCycleProfitSplits(
  splits: CycleProfitSplit[],
  requiredLevelIds?: string[]
): string | null {
  const seen = new Set<string>();
  for (const split of splits) {
    if (!split.investmentLevelId || seen.has(split.investmentLevelId)) {
      return "Each copy tier must have one profit split.";
    }
    seen.add(split.investmentLevelId);
    if (
      !Number.isFinite(split.traderPct) ||
      !Number.isFinite(split.copierPct) ||
      split.traderPct < 0 ||
      split.traderPct > 100 ||
      split.copierPct < 0 ||
      split.copierPct > 100 ||
      Math.abs(split.traderPct + split.copierPct - 100) > 0.001
    ) {
      return "Trader and copier percentages must add up to 100% for every tier.";
    }
  }
  if (requiredLevelIds?.some((id) => !seen.has(id))) {
    return "Set a profit split for every active copy tier.";
  }
  if (requiredLevelIds && splits.some((split) => !requiredLevelIds.includes(split.investmentLevelId))) {
    return "A profit split references an unavailable copy tier.";
  }
  return null;
}

export function formatCycleProfitSplit(split: CycleProfitSplit | null | undefined): string {
  if (!split) return "Not set";
  return `Copier ${formatPct(split.copierPct)} · Trader ${formatPct(split.traderPct)}`;
}

function formatPct(value: number): string {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
}
