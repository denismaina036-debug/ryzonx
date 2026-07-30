import type {
  PlatformInvestmentLevel,
  PoolRoiMultiplier,
  RoiPreview,
  ReturnDurationPreset,
  ReturnDurationUnit,
} from "@/domain/roi/types";
import { formatReturnDurationLabel } from "@/domain/roi/return-duration";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Resolve which platform investment level an amount belongs to. */
export function resolveInvestmentLevel(
  amount: number,
  levels: PlatformInvestmentLevel[]
): PlatformInvestmentLevel | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const active = levels.filter((l) => l.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  for (const level of active) {
    const aboveMin = amount >= level.minAmount;
    const belowMax = level.maxAmount == null || amount <= level.maxAmount;
    if (aboveMin && belowMax) return level;
  }
  return null;
}

/** Look up the pool multiplier for a given investment level. */
export function resolveMultiplier(
  levelId: string | null,
  multipliers: PoolRoiMultiplier[]
): number | null {
  if (!levelId) return null;
  const match = multipliers.find((m) => m.investmentLevelId === levelId);
  return match?.multiplier ?? null;
}

/** Calculate projected payout: investment × multiplier. */
export function calculateProjectedPayout(amount: number, multiplier: number): number {
  return roundMoney(amount * multiplier);
}

/** Build live ROI preview for investor UI. */
export function buildRoiPreview(input: {
  amount: number;
  levels: PlatformInvestmentLevel[];
  multipliers: PoolRoiMultiplier[];
  returnDurationPreset: ReturnDurationPreset;
  returnDurationValue: number;
  returnDurationUnit: ReturnDurationUnit;
  cumulativeRealisedReturn?: number;
  targetFulfilled?: boolean;
}): RoiPreview {
  const level = resolveInvestmentLevel(input.amount, input.levels);
  const multiplier = level ? resolveMultiplier(level.id, input.multipliers) : null;
  const projectedPayout =
    multiplier != null && input.amount > 0
      ? calculateProjectedPayout(input.amount, multiplier)
      : null;

  let realisedMultiplier: number | undefined;
  let targetProgressPct: number | undefined;

  if (
    input.cumulativeRealisedReturn != null &&
    input.amount > 0 &&
    projectedPayout != null &&
    projectedPayout > 0
  ) {
    realisedMultiplier = roundMoney(
      (input.amount + input.cumulativeRealisedReturn) / input.amount
    );
    targetProgressPct = Math.min(
      100,
      roundMoney((input.cumulativeRealisedReturn / (projectedPayout - input.amount)) * 100)
    );
  }

  return {
    investmentAmount: input.amount,
    investmentLevel: level,
    multiplier,
    projectedPayout,
    returnDurationLabel: formatReturnDurationLabel({
      preset: input.returnDurationPreset,
      value: input.returnDurationValue,
      unit: input.returnDurationUnit,
    }),
    realisedMultiplier,
    targetProgressPct,
    targetFulfilled: input.targetFulfilled,
  };
}

/** Format multiplier for display (e.g. 2.00×). */
export function formatMultiplier(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}×`;
}

/** Validate a multiplier input string. */
export function validateMultiplier(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Multiplier is required.";
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return "Multiplier must be a positive number.";
  if (n > 100) return "Multiplier cannot exceed 100×.";
  return null;
}

/** Check if cumulative realised return has reached the projected target. */
export function isTargetFulfilled(
  investmentAmount: number,
  multiplier: number,
  cumulativeRealisedReturn: number
): boolean {
  const targetProfit = roundMoney(investmentAmount * multiplier - investmentAmount);
  return cumulativeRealisedReturn >= targetProfit;
}
