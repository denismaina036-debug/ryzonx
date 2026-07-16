export const GOVERNANCE_STAGE = {
  APPLICATION: "application",
  CHALLENGE: "challenge",
  STRATEGY_REVIEW: "strategy_review",
  APPROVED: "approved",
  ACTIVE: "active",
  PERFORMANCE_MONITORING: "performance_monitoring",
  REVIEW: "review",
  WARNING: "warning",
  PROBATION: "probation",
  RESTRICTED: "restricted",
  SUSPENDED: "suspended",
  REMOVED: "removed",
} as const;

export type GovernanceStage = (typeof GOVERNANCE_STAGE)[keyof typeof GOVERNANCE_STAGE];

export const GOVERNANCE_STAGE_LABELS: Record<string, string> = {
  application: "Application",
  challenge: "Challenge",
  strategy_review: "Strategy Review",
  approved: "Approved",
  active: "Active",
  performance_monitoring: "Performance Monitoring",
  review: "Under Review",
  warning: "Warning",
  probation: "Probation",
  restricted: "Restricted",
  suspended: "Suspended",
  removed: "Removed",
};

export const WARNING_LEVEL = {
  INFORMATION: "information",
  MINOR: "minor",
  MAJOR: "major",
  CRITICAL: "critical",
} as const;

export const WARNING_LEVEL_LABELS: Record<string, string> = {
  information: "Information",
  minor: "Minor Warning",
  major: "Major Warning",
  critical: "Critical Warning",
};

export const VIOLATION_STATUS = {
  OPEN: "open",
  ACKNOWLEDGED: "acknowledged",
  RESOLVED: "resolved",
  DISMISSED: "dismissed",
} as const;

export const VIOLATION_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export const REVIEW_FREQUENCY = {
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  ANNUAL: "annual",
} as const;

export const REVIEW_FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
  ad_hoc: "Ad Hoc",
};

export const REVIEW_VISIBILITY = {
  INTERNAL: "internal",
  INVESTORS: "investors",
} as const;

export const GOVERNANCE_SCORE_CATEGORIES = [
  "consistency",
  "capital_preservation",
  "professional_conduct",
  "transparency",
  "risk_discipline",
  "communication",
  "investor_satisfaction",
  "strategy_adherence",
  "performance_stability",
  "long_term_reliability",
] as const;

export const GOVERNANCE_SCORE_CATEGORY_LABELS: Record<string, string> = {
  consistency: "Consistency",
  capital_preservation: "Capital Preservation",
  professional_conduct: "Professional Conduct",
  transparency: "Transparency",
  risk_discipline: "Risk Discipline",
  communication: "Communication",
  investor_satisfaction: "Investor Satisfaction",
  strategy_adherence: "Strategy Adherence",
  performance_stability: "Performance Stability",
  long_term_reliability: "Long-Term Reliability",
};

export const RULE_TYPE_LABELS: Record<string, string> = {
  max_daily_drawdown: "Maximum Daily Drawdown",
  max_overall_drawdown: "Maximum Overall Drawdown",
  max_consecutive_losing_days: "Maximum Consecutive Losing Days",
  max_consecutive_losing_trades: "Maximum Consecutive Losing Trades",
  min_monthly_return: "Minimum Monthly Return",
  min_win_rate: "Minimum Win Rate",
  max_exposure_per_trade: "Maximum Exposure Per Trade",
  max_exposure_per_market: "Maximum Exposure Per Market",
  max_open_positions: "Maximum Open Positions",
  max_daily_trades: "Maximum Daily Trades",
  min_monthly_trading_activity: "Minimum Monthly Trading Activity",
  max_weekly_volatility: "Maximum Weekly Volatility",
  custom: "Custom Rule",
};

/** Institutional committee language — never "Approved by Admin" */
export const COMMITTEE_LABELS = {
  governanceReview: "Reviewed by the RyvonX Investment Committee",
  riskApproval: "Approved by the RyvonX Risk Committee",
  governanceTeam: "Verified by the RyvonX Governance Team",
  reviewCompleted: "Governance Review Completed",
  warningIssued: "Action issued by the RyvonX Governance Team",
  suspension: "Suspended by the RyvonX Risk Committee",
  reactivation: "Reactivated by the RyvonX Investment Committee",
} as const;

/** Public investor protection indicators derived from governance state */
export const PROTECTION_INDICATOR = {
  RYVONX_VERIFIED: "ryvonx_verified",
  GOVERNANCE_APPROVED: "governance_approved",
  CURRENTLY_REVIEWED: "currently_reviewed",
  HEALTHY: "healthy",
  WATCHLIST: "watchlist",
  PROBATION: "probation",
  RESTRICTED: "restricted",
  SUSPENDED: "suspended",
  RYVONX_BACKED: "ryvonx_backed",
} as const;

export const PROTECTION_INDICATOR_LABELS: Record<string, string> = {
  ryvonx_verified: "RyvonX Verified",
  governance_approved: "Governance Approved",
  currently_reviewed: "Currently Reviewed",
  healthy: "Healthy Pool",
  watchlist: "Watchlist",
  probation: "Probation",
  restricted: "Restricted",
  suspended: "Suspended",
  ryvonx_backed: "RyvonX Backed",
};

export const GOVERNANCE_REPORT_TYPES = [
  "governance_history",
  "rule_violations",
  "manager_reviews",
  "pool_health_trends",
  "drawdown_analysis",
  "performance_consistency",
  "investor_growth",
  "suspension_history",
] as const;

export const GOVERNANCE_REPORT_LABELS: Record<string, string> = {
  governance_history: "Governance History",
  rule_violations: "Rule Violations",
  manager_reviews: "Manager Reviews",
  pool_health_trends: "Pool Health Trends",
  drawdown_analysis: "Drawdown Analysis",
  performance_consistency: "Performance Consistency",
  investor_growth: "Investor Growth",
  suspension_history: "Suspension History",
};
