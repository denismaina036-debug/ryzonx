/** ROI Engine v2 — standardized platform types. */

export interface PlatformInvestmentLevel {
  id: string;
  name: string;
  minAmount: number;
  maxAmount: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PoolRoiMultiplier {
  id: string;
  fundId: string;
  investmentLevelId: string;
  multiplier: number;
  /** Populated when joined with platform_investment_levels. */
  level?: PlatformInvestmentLevel;
}

export interface PoolRoiConfig {
  returnDurationPreset: ReturnDurationPreset;
  returnDurationValue: number;
  returnDurationUnit: ReturnDurationUnit;
  multipliers: PoolRoiMultiplier[];
}

export interface RoiPreview {
  investmentAmount: number;
  investmentLevel: PlatformInvestmentLevel | null;
  multiplier: number | null;
  projectedPayout: number | null;
  returnDurationLabel: string;
  /** Realised multiplier (cumulative return / investment). */
  realisedMultiplier?: number;
  /** Progress toward projected target (0–100). */
  targetProgressPct?: number;
  targetFulfilled?: boolean;
}

export const RETURN_DURATION_PRESETS = [
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "custom",
] as const;

export type ReturnDurationPreset = (typeof RETURN_DURATION_PRESETS)[number];

export const RETURN_DURATION_UNITS = ["hours", "days", "weeks", "months"] as const;

export type ReturnDurationUnit = (typeof RETURN_DURATION_UNITS)[number];

export const RETURN_DURATION_PRESET_LABELS: Record<ReturnDurationPreset, string> = {
  hourly: "Hourly",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  custom: "Custom Duration",
};

export const ROI_DISCLAIMER =
  "Projected ROI is the Pool Manager's target return. Actual returns depend on realised trading performance. Projected ROI is not guaranteed.";

export const ROI_DISCLAIMER_SHORT =
  "Projected returns are targets, not guarantees. Actual returns depend on trading performance.";
