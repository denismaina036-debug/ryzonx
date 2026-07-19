/** Strategy lifecycle statuses — permanent investment methodology. */
export const STRATEGY_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "available",
  "operating",
  "paused",
  "archived",
] as const;

export type StrategyStatus = (typeof STRATEGY_STATUSES)[number];

export const STRATEGY_VISIBILITY = ["private", "internal", "public"] as const;
export type StrategyVisibility = (typeof STRATEGY_VISIBILITY)[number];

export const STRATEGY_RISK_PROFILES = [
  "conservative",
  "balanced",
  "moderate",
  "aggressive",
  "speculative",
] as const;

export type StrategyRiskProfile = (typeof STRATEGY_RISK_PROFILES)[number];

export const STRATEGY_STATUS_LABELS: Record<StrategyStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  available: "Available",
  operating: "Operating",
  paused: "Paused",
  archived: "Archived",
};

/** Valid forward transitions for Pool Manager–initiated actions. */
export const STRATEGY_MANAGER_TRANSITIONS: Partial<
  Record<StrategyStatus, StrategyStatus[]>
> = {
  draft: ["submitted"],
  submitted: ["draft"],
  approved: ["available"],
  available: ["operating", "archived"],
  operating: ["paused", "archived"],
  paused: ["operating", "archived"],
};

/** Valid admin review transitions. */
export const STRATEGY_ADMIN_TRANSITIONS: Partial<
  Record<StrategyStatus, StrategyStatus[]>
> = {
  submitted: ["under_review"],
  under_review: ["approved", "draft", "archived"],
  operating: ["archived"],
  paused: ["archived"],
  approved: ["archived"],
  available: ["archived"],
};
