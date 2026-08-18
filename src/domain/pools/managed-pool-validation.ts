import type { ManagedPoolFormInput } from "@/domain/pools/managed-pool";
import {
  parseCoverImagePosition,
  serializeCoverImagePosition,
} from "@/domain/pools/cover-image-position";
import {
  parseCycleAmount,
  parseCycleInvestorCount,
  sanitizeCycleCapacityFields,
  validateCycleCapacityFields,
} from "@/domain/investment/cycle-validation";
import { normalizeMarketCodes } from "@/domain/reference-data/utils";
import { validateMultiplier } from "@/domain/roi/calculator";
import { durationToDays, resolveReturnDuration } from "@/domain/roi/return-duration";

export type ManagedPoolValidationMode = "draft" | "submit";

function parseAmount(value: string | number | null | undefined): number | undefined {
  return parseCycleAmount(value);
}

export function normalizeManagedPoolForm(input: ManagedPoolFormInput): ManagedPoolFormInput {
  return {
    ...input,
    poolName: input.poolName.trim(),
    strategyName: input.strategyName.trim(),
    strategyDescription: input.strategyDescription.trim(),
    marketsTradedCodes: normalizeMarketCodes(input.marketsTradedCodes),
    tradingInstrumentCodes: Array.isArray(input.tradingInstrumentCodes)
      ? input.tradingInstrumentCodes.filter(Boolean)
      : [],
    coverImagePosition: serializeCoverImagePosition(
      parseCoverImagePosition(input.coverImagePosition)
    ),
  };
}

export function validateRoiConfig(input: ManagedPoolFormInput): string | null {
  const duration = resolveReturnDuration({
    preset: input.returnDurationPreset,
    value: parseAmount(input.returnDurationValue),
    unit: input.returnDurationUnit,
  });

  if (input.returnDurationPreset === "hourly" || input.returnDurationPreset === "custom") {
    const value = parseAmount(input.returnDurationValue);
    if (!value || value <= 0) {
      return input.returnDurationPreset === "hourly"
        ? "Hourly return duration must specify a positive number of hours."
        : "Custom return duration must be a positive number.";
    }
  }

  if (!input.roiMultipliers?.length) {
    return "Configure ROI multipliers for each investment level.";
  }

  for (const entry of input.roiMultipliers) {
    const error = validateMultiplier(entry.multiplier);
    if (error) return error;
  }

  void duration;
  return null;
}

export function validateManagedPoolForm(
  input: ManagedPoolFormInput,
  options: { mode?: ManagedPoolValidationMode } = {}
): string | null {
  const mode = options.mode ?? "submit";
  const normalized = normalizeManagedPoolForm(input);

  if (!normalized.poolName) {
    return "Pool name is required.";
  }

  if (mode === "submit" && !normalized.strategyId.trim()) {
    return "Select an approved strategy before submitting.";
  }

  if (mode === "submit") {
    const markets = normalizeMarketCodes(normalized.marketsTradedCodes);
    if (markets.length === 0) {
      return "Select at least one market in What Is Traded.";
    }
    if (normalized.tradingInstrumentCodes.length === 0) {
      return "Select at least one trading instrument in What Is Traded.";
    }

    if (!normalized.tradingSessionKey.trim()) {
      return "Select a trading session.";
    }

    if (!normalized.tradingSchedulePreset.trim()) {
      return "Select when you trade each week.";
    }

    if (!normalized.tradingScheduleTime.trim()) {
      return "Set your trading start time (New York Time).";
    }

    if (
      normalized.tradingSchedulePreset === "custom" &&
      normalized.tradingScheduleDays.length === 0
    ) {
      return "Select at least one trading day.";
    }

    const roiError = validateRoiConfig(normalized);
    if (roiError) return roiError;

    const duration = resolveReturnDuration({
      preset: normalized.returnDurationPreset,
      value: parseAmount(normalized.returnDurationValue),
      unit: normalized.returnDurationUnit,
    });

    const capacityError = validateCycleCapacityFields(
      sanitizeCycleCapacityFields({
        targetCapital: parseAmount(normalized.maxPoolSize),
        minInvestment: parseAmount(normalized.minInvestment),
        maxCapacity: parseAmount(normalized.maxPoolSize),
        durationDays: durationToDays(duration.value, duration.unit),
      })
    );
    if (capacityError) return capacityError;

    if (parseCycleInvestorCount(normalized.maxInvestors) == null) {
      return "Target investors must be a whole number greater than zero.";
    }
  }

  return null;
}
