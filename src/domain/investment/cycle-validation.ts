/** Shared validation for investment cycle capacity fields (UI + API). */

export function parseCycleAmount(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

/** Treat zero/blank max capacity as unset — avoids DB constraint failures. */
export function parseCycleMaxCapacity(value: string): number | undefined {
  const n = parseCycleAmount(value);
  if (n == null || n <= 0) return undefined;
  return n;
}

export function parseCycleMinInvestment(value: string): number | undefined {
  const n = parseCycleAmount(value);
  if (n == null || n <= 0) return undefined;
  return n;
}

export interface CycleCapacityFields {
  targetCapital?: number | null;
  minInvestment?: number | null;
  maxCapacity?: number | null;
  durationDays?: number | null;
}

export function validateCycleCapacityFields(fields: CycleCapacityFields): string | null {
  const target = fields.targetCapital ?? null;
  const max = fields.maxCapacity ?? null;
  const min = fields.minInvestment ?? null;
  const duration = fields.durationDays ?? null;

  if (target != null && target < 0) {
    return "Target capital cannot be negative.";
  }
  if (min != null && min <= 0) {
    return "Minimum investment must be greater than zero, or leave the field blank.";
  }
  if (duration != null && duration <= 0) {
    return "Duration must be at least one day, or leave the field blank.";
  }
  if (max != null && target != null && max < target) {
    return "Max capacity must be at least equal to target capital. Leave max capacity blank if you don't need a cap above your target.";
  }
  if (min != null && target != null && min > target) {
    return "Minimum investment cannot exceed target capital.";
  }
  return null;
}

export function friendlyInvestmentCycleError(message: string): string {
  if (message.includes("investment_cycles_capacity_bounds")) {
    return "Max capacity must be at least equal to target capital. Leave max capacity blank if unused.";
  }
  if (message.includes("min_investment") && message.includes("check constraint")) {
    return "Minimum investment must be greater than zero, or leave the field blank.";
  }
  if (message.includes("duration_days") && message.includes("check constraint")) {
    return "Duration must be at least one day, or leave the field blank.";
  }
  return message;
}

export function sanitizeCycleCapacityFields(
  input: CycleCapacityFields
): Required<Pick<CycleCapacityFields, "targetCapital" | "minInvestment" | "maxCapacity" | "durationDays">> {
  const target =
    input.targetCapital != null && input.targetCapital >= 0 ? input.targetCapital : null;
  const min =
    input.minInvestment != null && input.minInvestment > 0 ? input.minInvestment : null;
  const max =
    input.maxCapacity != null && input.maxCapacity > 0 ? input.maxCapacity : null;
  const duration =
    input.durationDays != null && input.durationDays > 0 ? input.durationDays : null;

  return { targetCapital: target, minInvestment: min, maxCapacity: max, durationDays: duration };
}
