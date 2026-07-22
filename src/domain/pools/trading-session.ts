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

/** Normalize stored value for `<input type="datetime-local" />`. */
export function toTradingDateTimeLocalValue(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 16);
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
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
    date = new Date(trimmed);
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
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  return `${datePart} at ${timePart} (${TRADING_TIME_ZONE_LABEL})`;
}

export function tradingSessionLabel(key: string | undefined, custom?: string): string | null {
  if (!key) return null;
  const option = TRADING_SESSION_OPTIONS.find((o) => o.value === key);
  if (key === "custom") return custom?.trim() || "Custom Session";
  return option?.label ?? key;
}
