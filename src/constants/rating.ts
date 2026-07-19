/** Configurable rating categories — weights stored in rating_category_weights. */
export const RATING_CATEGORIES = [
  "trading_performance",
  "risk_management",
  "consistency",
  "capital_preservation",
  "governance",
  "operational_discipline",
  "investor_confidence",
] as const;

export type RatingCategory = (typeof RATING_CATEGORIES)[number];

export const RATING_CATEGORY_LABELS: Record<RatingCategory, string> = {
  trading_performance: "Trading Performance",
  risk_management: "Risk Management",
  consistency: "Consistency",
  capital_preservation: "Capital Preservation",
  governance: "Governance",
  operational_discipline: "Operational Discipline",
  investor_confidence: "Investor Confidence",
};

export const RATING_ENTITY_TYPES = ["pool_manager", "strategy", "investment_cycle"] as const;
export type RatingEntityType = (typeof RATING_ENTITY_TYPES)[number];

export const RATING_ENTITY_TYPE_LABELS: Record<RatingEntityType, string> = {
  pool_manager: "Pool Manager",
  strategy: "Strategy",
  investment_cycle: "Investment Cycle",
};

export const RATING_TRENDS = ["up", "down", "stable"] as const;
export type RatingTrend = (typeof RATING_TRENDS)[number];

export const RATING_AUDIT_ACTIONS = {
  PROFILE_CREATED: "rating_profile_created",
  PROFILE_UPDATED: "rating_profile_updated",
  WEIGHTS_UPDATED: "rating_weights_updated",
  RECALCULATED: "ratings_recalculated",
  SNAPSHOT_SAVED: "rating_snapshot_saved",
} as const;

export const RATING_ENTITY_TYPE = "rating_profile";
