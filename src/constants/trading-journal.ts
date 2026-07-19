/** Trading journal lifecycle for investment cycles. */
export const TRADE_JOURNAL_STATUSES = ["active", "archived"] as const;
export type TradeJournalStatus = (typeof TRADE_JOURNAL_STATUSES)[number];

export const TRADING_JOURNAL_ENTITY_TYPE = "trade_journal";
export const TRADE_ENTRY_ENTITY_TYPE = "trade_entry";
export const TRADE_SNAPSHOT_ENTITY_TYPE = "trade_snapshot";
export const CYCLE_PROGRESS_ENTITY_TYPE = "cycle_progress";

export const TRADING_JOURNAL_AUDIT_ACTIONS = {
  JOURNAL_CREATED: "trade_journal_created",
  SNAPSHOT_CREATED: "trade_snapshot_created",
  TRADE_OPENED: "trade_opened",
  TRADE_EDITED: "trade_edited",
  TRADE_CLOSED: "trade_closed",
  OPERATIONAL_FLAG: "operational_flag_raised",
  ADMIN_REVIEW: "operations_admin_review",
} as const;

/** Cycle statuses where pool managers may record trades. */
export const TRADING_JOURNAL_WRITABLE_CYCLE_STATUSES = ["trading", "distribution"] as const;

/** Cycle statuses where journal is visible (read-only after completion). */
export const TRADING_JOURNAL_VISIBLE_CYCLE_STATUSES = [
  "trading",
  "distribution",
  "completed",
  "archived",
] as const;
