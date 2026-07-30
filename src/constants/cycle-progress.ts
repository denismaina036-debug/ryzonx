/** Operational progress phases for active investment cycles. */
export const CYCLE_PROGRESS_PHASES = [
  "funding",
  "trading",
  "monitoring",
  "distribution_pending",
  "completed",
] as const;
export type CycleProgressPhase = (typeof CYCLE_PROGRESS_PHASES)[number];

/** Simplified investor / pool-manager view — funding and trading only. */
export const SIMPLIFIED_CYCLE_PHASES = ["funding", "trading"] as const;
export type SimplifiedCyclePhase = (typeof SIMPLIFIED_CYCLE_PHASES)[number];

export const SIMPLIFIED_CYCLE_PHASE_LABELS: Record<SimplifiedCyclePhase, string> = {
  funding: "Funding",
  trading: "Trading",
};

export function resolveSimplifiedCyclePhase(input: {
  cycleStatus: string;
}): SimplifiedCyclePhase {
  if (["funding", "approved", "draft", "submitted"].includes(input.cycleStatus)) {
    return "funding";
  }
  return "trading";
}

export const CYCLE_PROGRESS_PHASE_LABELS: Record<CycleProgressPhase, string> = {
  funding: "Funding",
  trading: "Trading",
  monitoring: "Monitoring",
  distribution_pending: "Distribution Pending",
  completed: "Completed",
};

export const CYCLE_PROGRESS_EVENT_TYPES = [
  "status_change",
  "trade_opened",
  "trade_closed",
  "trade_edited",
  "snapshot_created",
  "admin_review",
  "operational_flag",
  "cycle_advanced",
] as const;
export type CycleProgressEventType = (typeof CYCLE_PROGRESS_EVENT_TYPES)[number];

export const CYCLE_PROGRESS_ENTITY_TYPE = "cycle_progress";
