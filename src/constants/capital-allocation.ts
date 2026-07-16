export const MANAGER_LEVEL = {
  VERIFIED: "verified_pool_manager",
  PROFESSIONAL: "professional_pool_manager",
  ELITE: "elite_pool_manager",
  CAPITAL_CANDIDATE: "capital_allocation_candidate",
  RYVONX_BACKED: "ryvonx_backed_fund_manager",
} as const;

export const MANAGER_LEVEL_LABELS: Record<string, string> = {
  verified_pool_manager: "Verified Pool Manager",
  professional_pool_manager: "Professional Pool Manager",
  elite_pool_manager: "Elite Pool Manager",
  capital_allocation_candidate: "RyvonX Capital Allocation Candidate",
  ryvonx_backed_fund_manager: "RyvonX Backed Fund Manager",
};

export const MANAGER_LEVEL_ORDER = [
  "verified_pool_manager",
  "professional_pool_manager",
  "elite_pool_manager",
  "capital_allocation_candidate",
  "ryvonx_backed_fund_manager",
] as const;

export const ALLOCATION_STATUS = {
  NONE: "none",
  CANDIDATE: "candidate",
  UNDER_REVIEW: "under_review",
  APPROVED: "approved",
  ACTIVE: "active",
  PAUSED: "paused",
  REDUCED: "reduced",
  REMOVED: "removed",
} as const;

export const ALLOCATION_STATUS_LABELS: Record<string, string> = {
  none: "No Allocation",
  candidate: "Candidate",
  under_review: "Under Committee Review",
  approved: "Approved",
  active: "Active Allocation",
  paused: "Allocation Paused",
  reduced: "Allocation Reduced",
  removed: "Allocation Removed",
};

export const ALLOCATION_ACTION = {
  CANDIDATE: "candidate",
  REVIEW: "review",
  APPROVE: "approve",
  ALLOCATE: "allocate",
  INCREASE: "increase",
  MAINTAIN: "maintain",
  REDUCE: "reduce",
  PAUSE: "pause",
  REMOVE: "remove",
} as const;

export const CAPITAL_COMMITTEE_LABELS = {
  capitalCommittee: "Approved by the RyvonX Capital Committee",
  investmentCommittee: "Reviewed by the RyvonX Investment Committee",
  riskCommittee: "Approved by the RyvonX Risk Committee",
  governanceCommittee: "Verified by the RyvonX Governance Committee",
  reviewCompleted: "Capital Committee Review Completed",
  promotion: "Promotion approved by the RyvonX Investment Committee",
  achievement: "Achievement awarded by the RyvonX Governance Committee",
} as const;

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  pool_update: "Pool Update",
  commentary: "Monthly Commentary",
  article: "Educational Article",
  outlook: "Market Outlook",
  performance_report: "Performance Report",
  announcement: "Manager Announcement",
};

export const CONTENT_STATUS = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  PUBLISHED: "published",
  REJECTED: "rejected",
} as const;

export const CAPITAL_REPORT_TYPES = [
  "capital_allocations",
  "manager_growth",
  "pool_growth",
  "investor_growth",
  "committee_decisions",
  "historical_allocations",
  "performance_reviews",
] as const;

export const CAPITAL_REPORT_LABELS: Record<string, string> = {
  capital_allocations: "Capital Allocation Report",
  manager_growth: "Manager Growth Report",
  pool_growth: "Pool Growth Report",
  investor_growth: "Investor Growth Report",
  committee_decisions: "Committee Decisions",
  historical_allocations: "Historical Allocations",
  performance_reviews: "Performance Reviews",
};

export const PROMOTION_REQUIREMENTS: Record<string, string[]> = {
  professional_pool_manager: [
    "Minimum 6 months as Verified Pool Manager",
    "Healthy governance status",
    "Consistent positive performance",
    "No major rule violations",
  ],
  elite_pool_manager: [
    "Minimum 12 months track record",
    "Strong risk management scores",
    "Growing investor base",
    "Governance committee recommendation",
  ],
  capital_allocation_candidate: [
    "Elite Pool Manager status",
    "Exceptional consistency and drawdown control",
    "Clean governance history",
    "Investment Committee evaluation",
  ],
  ryvonx_backed_fund_manager: [
    "Capital Allocation Candidate status",
    "Capital Committee approval",
    "Active RyvonX capital allocation",
  ],
};
