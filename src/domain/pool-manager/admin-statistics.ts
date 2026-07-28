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
  activeInvestors?: number | null;
  displayReviewCount?: number | null;
  displayTradeCount?: number | null;
  displayInvestorCount?: number | null;
  successfulCycles?: number | null;
  followers?: number | null;
  averageTradeDurationHours?: number | null;
  safetyRating?: number | null;
  performanceRating?: number | null;
  consistencyScore?: number | null;
  experienceYears?: number | null;
  successRatio?: number | null;
  totalProfits?: number | null;
  riskRating?: string | null;
}

export type PoolManagerStatField = keyof PoolManagerAdminStatistics;

export const POOL_MANAGER_STAT_FIELD_LABELS: Record<PoolManagerStatField, string> = {
  winRatePct: "Win Rate (%)",
  avgMonthlyReturnPct: "Average Monthly Return (%)",
  maxDrawdownPct: "Max Drawdown (%)",
  ryvonxRating: "Overall Rating (0–5)",
  securityRating: "Security Rating (0–100)",
  aggressivenessRating: "Aggressiveness Rating (0–100)",
  assetsUnderManagement: "Assets Under Management",
  totalCapitalManaged: "Total Capital Managed",
  activeInvestors: "Investors",
  displayReviewCount: "Review Count (display)",
  displayTradeCount: "Trade Count (display)",
  displayInvestorCount: "Investor Count (display)",
  successfulCycles: "Successful Cycles",
  followers: "Followers",
  averageTradeDurationHours: "Average Trade Duration (hours)",
  safetyRating: "Safety Rating",
  performanceRating: "Performance Rating",
  consistencyScore: "Consistency Score",
  experienceYears: "Experience (years)",
  successRatio: "Success Ratio (%)",
  totalProfits: "Total Profits",
  riskRating: "Risk Rating",
};

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
  "activeInvestors",
  "successfulCycles",
  "followers",
  "averageTradeDurationHours",
  "safetyRating",
  "performanceRating",
  "consistencyScore",
  "experienceYears",
  "successRatio",
  "totalProfits",
  "riskRating",
];
