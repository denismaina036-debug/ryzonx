import type { ManagedPoolFormInput } from "@/domain/pools/managed-pool";
import {
  parseCoverImagePosition,
  serializeCoverImagePosition,
} from "@/domain/pools/cover-image-position";
import {
  sanitizeCycleCapacityFields,
  validateCycleCapacityFields,
} from "@/domain/investment/cycle-validation";
import { validateFixedReturnRows } from "@/domain/pools/fixed-return";
import { validateVariableReturnConfig } from "@/domain/pools/variable-return";
import { normalizeMarketCodes } from "@/domain/reference-data/utils";

export type ManagedPoolValidationMode = "draft" | "submit";

function parseAmount(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
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

    if (normalized.returnModel === "fixed") {
      const fixedError = validateFixedReturnRows(normalized.fixedReturnRows);
      if (fixedError) return fixedError;
    } else {
      const variableError = validateVariableReturnConfig({
        returnTiers: normalized.returnTiers,
        investorSharePct: normalized.investorSharePct,
        poolManagerSharePct: normalized.poolManagerSharePct,
      });
      if (variableError) return variableError;
    }

    const capacityError = validateCycleCapacityFields(
      sanitizeCycleCapacityFields({
        targetCapital: parseAmount(normalized.maxPoolSize),
        minInvestment: parseAmount(normalized.minInvestment),
        maxCapacity: parseAmount(normalized.maxPoolSize),
        durationDays: parseAmount(normalized.tradingDurationDays),
      })
    );
    if (capacityError) return capacityError;
  } else {
    const min = parseAmount(normalized.minInvestment);
    if (min != null && min <= 0) {
      return "Minimum investment must be greater than zero, or leave blank.";
    }
    const target = parseAmount(normalized.maxPoolSize);
    if (target != null && target <= 0) {
      return "Maximum pool size must be greater than zero, or leave blank.";
    }
    const duration = parseAmount(normalized.tradingDurationDays);
    if (duration != null && duration <= 0) {
      return "Duration must be greater than zero, or leave blank.";
    }
  }

  return null;
}
