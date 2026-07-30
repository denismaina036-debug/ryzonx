/** Admin-editable Pool Manager statistics (merged over live metrics on public surfaces). */
export interface PoolManagerAdminStatistics {
  winRatePct?: number | null;
  avgMonthlyReturnPct?: number | null;
  maxDrawdownPct?: number | null;
  ryvonxRating?: number | null;
  securityRating?: number | null;
  aggressivenessRating?: number | null;
  assetsUnderManagement?: number | null;
  totalCapitalManaged?: number | null;
  displayReviewCount?: number | null;
  displayTradeCount?: number | null;
  displayInvestorCount?: number | null;
  successfulCycles?: number | null;
  followers?: number | null;
  averageTradeDurationHours?: number | null;
  safetyRating?: number | null;
  performanceRating?: number | null;
  consistencyScore?: number | null;
  /** Public profile: years on RyvonX (admin baseline; live tenure can exceed). */
  yearsOnRyvonX?: number | null;
  /** @deprecated Use yearsOnRyvonX */
  experienceYears?: number | null;
  successRatio?: number | null;
  totalProfits?: number | null;
  riskRating?: string | null;
  /** @deprecated Use displayInvestorCount */
  activeInvestors?: number | null;
}

export type PoolManagerStatField = keyof PoolManagerAdminStatistics;

export const POOL_MANAGER_STAT_FIELD_LABELS: Record<
  Exclude<PoolManagerStatField, "experienceYears" | "activeInvestors">,
  string
> = {
  winRatePct: "Win Rate (%)",
  avgMonthlyReturnPct: "Average Monthly Return (%)",
  maxDrawdownPct: "Max Drawdown (%)",
  ryvonxRating: "RyvonX Rating (0–5)",
  securityRating: "Security Rating (0–5)",
  aggressivenessRating: "Aggressiveness Rating (deprecated)",
  assetsUnderManagement: "Capital / AUM (baseline $)",
  totalCapitalManaged: "Total Capital Managed ($)",
  displayInvestorCount: "Active Investors (baseline count)",
  displayReviewCount: "Reviews (baseline count)",
  displayTradeCount: "Verified Trades (baseline count)",
  successfulCycles: "Successful Cycles",
  followers: "Followers",
  averageTradeDurationHours: "Average Trade Duration (hours)",
  safetyRating: "Safety Rating",
  performanceRating: "Performance Rating",
  consistencyScore: "Consistency Score",
  yearsOnRyvonX: "Years on RyvonX",
  successRatio: "Success Ratio (%)",
  totalProfits: "Total Profits ($)",
  riskRating: "Risk Rating",
};

export const POOL_MANAGER_STAT_FIELD_HINTS: Partial<
  Record<keyof typeof POOL_MANAGER_STAT_FIELD_LABELS, string>
> = {
  assetsUnderManagement:
    "Baseline capital shown publicly. Live pool totals above this value display automatically.",
  displayInvestorCount:
    "Baseline investor count. Live investor totals above this value display automatically.",
  displayReviewCount:
    "Baseline review count. Live reviews above this value display automatically.",
  displayTradeCount:
    "Baseline trade count. Live verified trades above this value display automatically.",
  yearsOnRyvonX:
    "Baseline tenure on RyvonX. Actual platform years above this value display automatically.",
  maxDrawdownPct:
    "Enter as a positive number (e.g. 8 for 8%). Shown publicly as a negative percentage.",
  securityRating: "Manager security score from 0 to 5 stars.",
  consistencyScore:
    "Consistency score (0–100) shown in Performance Intelligence on the public profile.",
};

export interface PoolManagerStatSection {
  id: string;
  title: string;
  description?: string;
  fields: Array<keyof typeof POOL_MANAGER_STAT_FIELD_LABELS>;
}

/** Single admin home for all manager profile statistics (pool card seeds live under Marketplace). */
export const POOL_MANAGER_STAT_SECTIONS: PoolManagerStatSection[] = [
  {
    id: "performance",
    title: "Performance",
    description: "Win rate, returns, and drawdown on the public manager profile.",
    fields: ["winRatePct", "avgMonthlyReturnPct", "maxDrawdownPct", "successRatio"],
  },
  {
    id: "ratings",
    title: "Ratings",
    description:
      "RyvonX overall rating, security (0–5), and consistency for Performance Intelligence.",
    fields: ["ryvonxRating", "securityRating", "consistencyScore"],
  },
  {
    id: "capital",
    title: "Capital & Investors",
    description:
      "Baseline figures for capital and investors. Leave blank to follow live platform data only.",
    fields: [
      "assetsUnderManagement",
      "totalCapitalManaged",
      "displayInvestorCount",
      "totalProfits",
    ],
  },
  {
    id: "activity",
    title: "Activity & Trust",
    description: "Baseline counts for trades, reviews, cycles, and followers.",
    fields: [
      "displayTradeCount",
      "displayReviewCount",
      "successfulCycles",
      "followers",
      "averageTradeDurationHours",
    ],
  },
  {
    id: "tenure",
    title: "Tenure",
    fields: ["yearsOnRyvonX"],
  },
];

export const POOL_MANAGER_EDITABLE_STAT_FIELDS = POOL_MANAGER_STAT_SECTIONS.flatMap(
  (section) => section.fields
);

/** Maps admin stat fields to pool_managers column names when stored on the row. */
export const POOL_MANAGER_STAT_COLUMN_MAP: Partial<
  Record<PoolManagerStatField, string>
> = {
  winRatePct: "win_rate_pct",
  avgMonthlyReturnPct: "avg_monthly_return_pct",
  maxDrawdownPct: "max_drawdown_pct",
  ryvonxRating: "ryvonx_rating",
  securityRating: "security_rating",
  aggressivenessRating: "aggressiveness_rating",
  displayReviewCount: "display_review_count",
  displayTradeCount: "display_trade_count",
  displayInvestorCount: "display_investor_count",
};

/** Extended stats stored only in admin_statistics JSONB. */
export const POOL_MANAGER_JSON_STAT_FIELDS: PoolManagerStatField[] = [
  "assetsUnderManagement",
  "totalCapitalManaged",
  "successfulCycles",
  "followers",
  "averageTradeDurationHours",
  "safetyRating",
  "performanceRating",
  "consistencyScore",
  "yearsOnRyvonX",
  "successRatio",
  "totalProfits",
  "riskRating",
];
