import type { ProfessionalBackgroundSection } from "@/domain/pool-manager/types";

/** Normalize legacy single-instrument data to multi-select shape. */
export function normalizeProfessionalBackground(
  bg?: ProfessionalBackgroundSection
): ProfessionalBackgroundSection | undefined {
  if (!bg) return bg;

  if (bg.primaryTradingInstruments?.length) {
    return bg;
  }

  if (bg.primaryTradingInstrument?.trim()) {
    return {
      ...bg,
      primaryTradingInstruments: [bg.primaryTradingInstrument.trim()],
    };
  }

  return bg;
}

export function formatTradingInstruments(
  bg?: ProfessionalBackgroundSection
): string | undefined {
  const normalized = normalizeProfessionalBackground(bg);
  const instruments = normalized?.primaryTradingInstruments ?? [];
  if (instruments.length === 0) return undefined;
  return instruments.join(", ");
}
