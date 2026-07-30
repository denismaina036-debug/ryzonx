import type { ReturnDurationPreset, ReturnDurationUnit } from "@/domain/roi/types";
import { RETURN_DURATION_PRESET_LABELS } from "@/domain/roi/types";

/** Resolve preset to canonical value + unit. */
export function resolveReturnDuration(input: {
  preset: ReturnDurationPreset;
  value?: number | null;
  unit?: ReturnDurationUnit | null;
}): { value: number; unit: ReturnDurationUnit } {
  switch (input.preset) {
    case "hourly":
      return { value: 1, unit: "hours" };
    case "daily":
      return { value: 1, unit: "days" };
    case "weekly":
      return { value: 1, unit: "weeks" };
    case "monthly":
      return { value: 1, unit: "months" };
    case "custom":
    default:
      return {
        value: input.value && input.value > 0 ? input.value : 1,
        unit: input.unit ?? "days",
      };
  }
}

/** Convert duration to days for legacy pool_duration_days column. */
export function durationToDays(value: number, unit: ReturnDurationUnit): number {
  switch (unit) {
    case "hours":
      return Math.max(1, Math.ceil(value / 24));
    case "weeks":
      return value * 7;
    case "months":
      return value * 30;
    case "days":
    default:
      return value;
  }
}

export function formatReturnDurationLabel(input: {
  preset?: ReturnDurationPreset | string | null;
  value?: number | null;
  unit?: ReturnDurationUnit | string | null;
}): string {
  const preset = input.preset as ReturnDurationPreset | undefined;
  if (preset && preset !== "custom" && preset in RETURN_DURATION_PRESET_LABELS) {
    return RETURN_DURATION_PRESET_LABELS[preset];
  }

  const value = input.value;
  if (value == null || value <= 0) return "—";

  const unit = (input.unit ?? "days") as ReturnDurationUnit;
  const rounded = Math.round(value);

  if (unit === "hours") return rounded === 1 ? "1 Hour" : `${rounded} Hours`;
  if (unit === "weeks") return rounded === 1 ? "1 Week" : `${rounded} Weeks`;
  if (unit === "months") return rounded === 1 ? "1 Month" : `${rounded} Months`;
  return rounded === 1 ? "1 Day" : `${rounded} Days`;
}

export function inferReturnDurationPreset(input: {
  preset?: ReturnDurationPreset | string | null;
  value?: number | null;
  unit?: ReturnDurationUnit | string | null;
}): ReturnDurationPreset {
  if (
    input.preset &&
    ["hourly", "daily", "weekly", "monthly", "custom"].includes(input.preset)
  ) {
    return input.preset as ReturnDurationPreset;
  }
  if (input.value != null && input.value > 0) return "custom";
  return "daily";
}

/** Map legacy payout duration preset to ROI v2 preset. */
export function migrateLegacyPayoutPreset(
  legacy: string | null | undefined
): ReturnDurationPreset {
  switch (legacy) {
    case "daily":
      return "daily";
    case "weekly":
      return "weekly";
    case "monthly":
      return "monthly";
    case "every_session":
      return "hourly";
    case "custom":
      return "custom";
    default:
      return "daily";
  }
}
