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

export function tradingSessionLabel(key: string | undefined, custom?: string): string | null {
  if (!key) return null;
  const option = TRADING_SESSION_OPTIONS.find((o) => o.value === key);
  if (key === "custom") return custom?.trim() || "Custom Session";
  return option?.label ?? key;
}
