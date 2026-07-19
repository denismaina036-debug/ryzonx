import type { ManagedPoolFormInput } from "@/domain/pools/managed-pool";
import {
  sanitizeCycleCapacityFields,
  validateCycleCapacityFields,
} from "@/domain/investment/cycle-validation";

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
    const investorShare = parseAmount(normalized.investorSharePct);
    const pmShare = parseAmount(normalized.poolManagerSharePct);
    if (investorShare != null && pmShare != null) {
      const total = Math.round((investorShare + pmShare) * 100) / 100;
      if (total !== 100) {
        return "Investor and Pool Manager profit shares must total 100%.";
      }
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
