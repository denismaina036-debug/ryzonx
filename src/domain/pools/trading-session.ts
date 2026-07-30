/** Predefined trading session options — standard platform selections. */

export const TRADING_SESSION_OPTIONS = [
  { value: "asian", label: "Asian Session" },
  { value: "london", label: "London Session" },
  { value: "new_york", label: "New York Session" },
  { value: "london_new_york_overlap", label: "London / New York Overlap" },
  { value: "custom", label: "Custom Session" },
] as const;

export type TradingSessionKey = (typeof TRADING_SESSION_OPTIONS)[number]["value"];

export const TRADING_TIME_ZONE_LABEL = "New York Time";

/** When the pool manager starts trading each week. */
export const TRADING_SCHEDULE_PRESETS = [
  { value: "everyday", label: "Every day" },
  { value: "weekdays", label: "Monday – Friday" },
  { value: "custom", label: "Specific days" },
] as const;

export type TradingSchedulePreset = (typeof TRADING_SCHEDULE_PRESETS)[number]["value"];

export const TRADING_DAY_OPTIONS = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
  { value: "sunday", label: "Sun" },
] as const;

export type TradingDayValue = (typeof TRADING_DAY_OPTIONS)[number]["value"];

const WEEKDAY_DAYS: TradingDayValue[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

const DAY_LABELS: Record<TradingDayValue, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

/** Normalize stored value for `<input type="datetime-local" />`. */
export function toTradingDateTimeLocalValue(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
    }
    return trimmed.slice(0, 16);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00`;
  }
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const time = trimmed.slice(0, 5);
    const today = new Date().toISOString().slice(0, 10);
    return `${today}T${time}`;
  }
  return trimmed;
}

export function formatTradingDateTimeLabel(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;

  let date: Date | null = null;
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed) || /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    date = new Date(trimmed.includes("T") ? trimmed : `${trimmed}T00:00:00`);
  } else if (/^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const today = new Date().toISOString().slice(0, 10);
    date = new Date(`${today}T${trimmed.slice(0, 5)}`);
  }

  if (!date || Number.isNaN(date.getTime())) {
    return `${trimmed} (${TRADING_TIME_ZONE_LABEL})`;
  }

  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
  const timePart = formatTime12Hour(
    `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
  );

  return `${datePart} at ${timePart} (${TRADING_TIME_ZONE_LABEL})`;
}

export function tradingSessionLabel(key: string | undefined, custom?: string): string | null {
  if (!key) return null;
  const option = TRADING_SESSION_OPTIONS.find((o) => o.value === key);
  if (key === "custom") return custom?.trim() || "Custom Session";
  return option?.label ?? key;
}

export function formatTime12Hour(time24: string | undefined): string {
  const trimmed = time24?.trim() ?? "";
  const match = /^(\d{1,2}):(\d{2})/.exec(trimmed);
  if (!match) return trimmed;

  const hours = Number(match[1]);
  const minutes = match[2];
  if (!Number.isFinite(hours)) return trimmed;

  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${period}`;
}

export function resolveTradingScheduleDays(
  preset: string | undefined,
  days: string[] | undefined
): TradingDayValue[] {
  if (preset === "everyday") {
    return TRADING_DAY_OPTIONS.map((d) => d.value);
  }
  if (preset === "weekdays") {
    return [...WEEKDAY_DAYS];
  }
  return (days ?? []).filter((day): day is TradingDayValue =>
    TRADING_DAY_OPTIONS.some((option) => option.value === day)
  );
}

export function formatTradingScheduleDaysLabel(
  preset: string | undefined,
  days: string[] | undefined
): string | null {
  if (!preset) return null;
  if (preset === "everyday") return "Every day";
  if (preset === "weekdays") return "Monday – Friday";

  const resolved = resolveTradingScheduleDays(preset, days);
  if (resolved.length === 0) return null;
  const first = resolved[0];
  if (!first) return null;
  if (resolved.length === 1) return DAY_LABELS[first];
  if (resolved.length === 2) {
    const second = resolved[1];
    if (!second) return DAY_LABELS[first];
    return `${DAY_LABELS[first]} and ${DAY_LABELS[second]}`;
  }

  const labels = resolved.map((day) => DAY_LABELS[day]);
  const last = labels.pop();
  return `${labels.join(", ")} and ${last}`;
}

/** Human-readable recurring trading schedule for investors. */
export function formatTradingScheduleLabel(input: {
  preset?: string;
  days?: string[];
  time?: string;
  /** Legacy one-off datetime value. */
  legacyDateTime?: string;
}): string | null {
  const time = input.time?.trim();
  if (time) {
    const dayLabel = formatTradingScheduleDaysLabel(input.preset, input.days);
    if (!dayLabel) return null;
    return `${dayLabel} at ${formatTime12Hour(time)} (${TRADING_TIME_ZONE_LABEL})`;
  }

  if (input.legacyDateTime?.trim()) {
    return formatTradingDateTimeLabel(input.legacyDateTime);
  }

  return null;
}

/** Extract HH:mm from legacy datetime-local values. */
export function extractTimeFromLegacyTradingValue(value: string | undefined): string {
  const local = toTradingDateTimeLocalValue(value);
  if (local.includes("T")) {
    return local.split("T")[1]?.slice(0, 5) ?? "";
  }
  if (/^\d{2}:\d{2}/.test(local)) {
    return local.slice(0, 5);
  }
  return "";
}

export function resolveTradingScheduleFromConfig(config: {
  tradingSchedulePreset?: string;
  tradingScheduleDays?: string[];
  tradingScheduleTime?: string;
  tradingTimeNy?: string;
}): {
  tradingSchedulePreset: string;
  tradingScheduleDays: string[];
  tradingScheduleTime: string;
} {
  if (config.tradingScheduleTime?.trim()) {
    return {
      tradingSchedulePreset: config.tradingSchedulePreset ?? "",
      tradingScheduleDays: config.tradingScheduleDays ?? [],
      tradingScheduleTime: config.tradingScheduleTime.trim(),
    };
  }

  if (config.tradingTimeNy?.trim()) {
    return {
      tradingSchedulePreset: "everyday",
      tradingScheduleDays: [],
      tradingScheduleTime: extractTimeFromLegacyTradingValue(config.tradingTimeNy),
    };
  }

  return {
    tradingSchedulePreset: "",
    tradingScheduleDays: [],
    tradingScheduleTime: "",
  };
}
