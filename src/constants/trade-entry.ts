export const TRADE_ENTRY_DIRECTIONS = ["long", "short"] as const;
export type TradeEntryDirection = (typeof TRADE_ENTRY_DIRECTIONS)[number];

export const TRADE_ENTRY_STATUSES = [
  "draft",
  "open",
  "partially_closed",
  "closed",
  "archived",
] as const;
export type TradeEntryStatus = (typeof TRADE_ENTRY_STATUSES)[number];

export const TRADE_ENTRY_STATUS_LABELS: Record<TradeEntryStatus, string> = {
  draft: "Draft",
  open: "Open",
  partially_closed: "Partially Closed",
  closed: "Closed",
  archived: "Archived",
};

export const TRADE_ENTRY_DIRECTION_LABELS: Record<TradeEntryDirection, string> = {
  long: "Long",
  short: "Short",
};
