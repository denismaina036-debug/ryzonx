/** Investment Cycle lifecycle — temporary fundraising/trading period. */
export const INVESTMENT_CYCLE_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "prepared",
  "funding",
  "trading",
  "distribution",
  "completed",
  "archived",
] as const;

export type InvestmentCycleStatus = (typeof INVESTMENT_CYCLE_STATUSES)[number];

export const INVESTMENT_CYCLE_STATUS_LABELS: Record<InvestmentCycleStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  prepared: "Prepared",
  funding: "Funding",
  trading: "Trading",
  distribution: "Distribution",
  completed: "Completed",
  archived: "Archived",
};

/** Legacy-compatible display order. Runtime transitions may skip review-only states. */
export const INVESTMENT_CYCLE_LIFECYCLE_ORDER: InvestmentCycleStatus[] = [
  "draft",
  "submitted",
  "approved",
  "prepared",
  "funding",
  "trading",
  "distribution",
  "completed",
  "archived",
];

/**
 * Pool Managers control operational cycle transitions. Prepared cycles open
 * automatically when their predecessor starts trading; legacy submitted and
 * approved states remain readable but are not an approval requirement.
 */
export const INVESTMENT_CYCLE_MANAGER_TRANSITIONS: Partial<
  Record<InvestmentCycleStatus, InvestmentCycleStatus[]>
> = {
  draft: ["funding"],
  submitted: ["draft", "funding"],
  approved: ["funding"],
  prepared: ["funding"],
  funding: ["trading"],
  trading: ["completed"],
  distribution: ["completed"],
  completed: ["archived"],
};

/** Admin and system lifecycle transitions. */
export const INVESTMENT_CYCLE_ADMIN_TRANSITIONS: Partial<
  Record<InvestmentCycleStatus, InvestmentCycleStatus[]>
> = {
  draft: ["funding"],
  submitted: ["draft", "funding"],
  approved: ["funding"],
  prepared: ["funding"],
  funding: ["trading"],
  trading: ["distribution", "completed"],
  distribution: ["completed"],
  completed: ["archived"],
};

/** Statuses where investors may view cycle details publicly. */
export const INVESTMENT_CYCLE_PUBLIC_STATUSES: InvestmentCycleStatus[] = [
  "approved",
  "funding",
  "trading",
  "distribution",
  "completed",
  "archived",
];

/** Statuses where new allocations may be recorded immediately (not queued). */
export const INVESTMENT_CYCLE_ALLOCATABLE_STATUSES: InvestmentCycleStatus[] = ["funding"];
