import type { ManagedPoolDurationUnit } from "@/domain/pools/managed-pool";

export const PAYOUT_DURATION_PRESETS = [
  "daily",
  "weekly",
  "monthly",
  "every_session",
  "custom",
] as const;

export type PayoutDurationPreset = (typeof PAYOUT_DURATION_PRESETS)[number];

export const PAYOUT_DURATION_PRESET_LABELS: Record<PayoutDurationPreset, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  every_session: "Every Session",
  custom: "Custom",
};

export function formatPayoutDurationLabel(input: {
  payoutDurationPreset?: PayoutDurationPreset | string | null;
  durationDays?: number | null;
  durationUnit?: ManagedPoolDurationUnit | string | null;
}): string {
  const preset = input.payoutDurationPreset as PayoutDurationPreset | undefined;
  if (preset && preset !== "custom" && preset in PAYOUT_DURATION_PRESET_LABELS) {
    return PAYOUT_DURATION_PRESET_LABELS[preset as PayoutDurationPreset];
  }

  const value = input.durationDays;
  if (value == null || value <= 0) return "—";

  const unit = input.durationUnit ?? "days";
  const rounded = Math.round(value);
  if (unit === "weeks") return rounded === 1 ? "1 Week" : `${rounded} Weeks`;
  if (unit === "hours") return rounded === 1 ? "1 Hour" : `${rounded} Hours`;
  return rounded === 1 ? "1 Day" : `${rounded} Days`;
}

export function inferPayoutDurationPreset(input: {
  payoutDurationPreset?: PayoutDurationPreset | string | null;
  durationDays?: number | null;
  durationUnit?: ManagedPoolDurationUnit | string | null;
}): PayoutDurationPreset {
  if (
    input.payoutDurationPreset &&
    PAYOUT_DURATION_PRESETS.includes(input.payoutDurationPreset as PayoutDurationPreset)
  ) {
    return input.payoutDurationPreset as PayoutDurationPreset;
  }
  if (input.durationDays != null && input.durationDays > 0) return "custom";
  return "daily";
}
