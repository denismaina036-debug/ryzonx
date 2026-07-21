/** Investment Cycle lifecycle — temporary fundraising/trading period. */
export const INVESTMENT_CYCLE_STATUSES = [
  "draft",
  "submitted",
  "approved",
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
  funding: "Funding",
  trading: "Trading",
  distribution: "Distribution",
  completed: "Completed",
  archived: "Archived",
};

/** Ordered lifecycle — no state should be skipped. */
export const INVESTMENT_CYCLE_LIFECYCLE_ORDER: InvestmentCycleStatus[] = [
  "draft",
  "submitted",
  "approved",
  "funding",
  "trading",
  "distribution",
  "completed",
  "archived",
];

/** Pool Manager may submit drafts and revert submitted cycles to draft. */
export const INVESTMENT_CYCLE_MANAGER_TRANSITIONS: Partial<
  Record<InvestmentCycleStatus, InvestmentCycleStatus[]>
> = {
  draft: ["submitted"],
  submitted: ["draft"],
  approved: ["funding"],
  funding: ["trading"],
  trading: ["distribution"],
  completed: ["archived"],
};

/** Admin and system lifecycle transitions. */
export const INVESTMENT_CYCLE_ADMIN_TRANSITIONS: Partial<
  Record<InvestmentCycleStatus, InvestmentCycleStatus[]>
> = {
  draft: ["submitted"],
  submitted: ["approved", "draft"],
  approved: ["funding"],
  funding: ["trading", "approved"],
  trading: ["distribution"],
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

/** Statuses where new allocations may be recorded (model only — no deposit wiring). */
export const INVESTMENT_CYCLE_ALLOCATABLE_STATUSES: InvestmentCycleStatus[] = ["funding"];
