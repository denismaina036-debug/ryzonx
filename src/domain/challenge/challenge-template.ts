export const CHALLENGE_TEMPLATE_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  ARCHIVED: "archived",
} as const;

export type ChallengeTemplateStatus =
  (typeof CHALLENGE_TEMPLATE_STATUS)[keyof typeof CHALLENGE_TEMPLATE_STATUS];

export const CHALLENGE_RULE_PERMISSION = {
  ALLOWED: "allowed",
  NOT_ALLOWED: "not_allowed",
} as const;

export type ChallengeRulePermission =
  (typeof CHALLENGE_RULE_PERMISSION)[keyof typeof CHALLENGE_RULE_PERMISSION];

export interface ChallengeTemplateTradingRules {
  weekendHolding: ChallengeRulePermission;
  newsTrading: ChallengeRulePermission;
  hedging: ChallengeRulePermission;
  expertAdvisors: ChallengeRulePermission;
  copyTrading: ChallengeRulePermission;
  gridTrading: ChallengeRulePermission;
  martingale: ChallengeRulePermission;
}

export interface ChallengeTemplateTradeRequirements {
  requireStopLoss: boolean;
  requireTakeProfit: boolean;
  strategyNote: string | null;
}

export interface ChallengeTemplateTradingJournal {
  required: boolean;
  fields: string[];
}

export interface ChallengeTemplateEvaluationCriteria {
  riskManagement: number;
  tradingDiscipline: number;
  strategyConsistency: number;
  tradingJournalQuality: number;
  profitability: number;
}

export interface ChallengeTemplate {
  id: string;
  slug: string;
  name: string;
  status: ChallengeTemplateStatus;
  description: string | null;
  startingBalance: number;
  currency: string;
  platform: string;
  defaultBroker: string;
  profitTargetPct: number;
  minTradingDays: number;
  maxEvaluationDays: number;
  minClosedTrades: number;
  maxOverallDrawdownPct: number;
  maxDailyDrawdownPct: number;
  maxRiskPerTradePct: number;
  maxTotalExposurePct: number;
  maxSimultaneousPositions: number;
  tradingRules: ChallengeTemplateTradingRules;
  tradeRequirements: ChallengeTemplateTradeRequirements;
  tradingJournal: ChallengeTemplateTradingJournal;
  evaluationCriteria: ChallengeTemplateEvaluationCriteria;
  automaticFailureConditions: string[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ChallengeTemplateUpdateInput = Partial<
  Omit<ChallengeTemplate, "id" | "slug" | "isDefault" | "createdAt" | "updatedAt">
>;

export const CHALLENGE_TRADING_RULE_LABELS: Record<keyof ChallengeTemplateTradingRules, string> = {
  weekendHolding: "Weekend Holding",
  newsTrading: "News Trading",
  hedging: "Hedging",
  expertAdvisors: "Expert Advisors",
  copyTrading: "Copy Trading",
  gridTrading: "Grid Trading",
  martingale: "Martingale",
};

export const CHALLENGE_EVALUATION_CRITERIA_LABELS: Record<
  keyof ChallengeTemplateEvaluationCriteria,
  string
> = {
  riskManagement: "Risk Management",
  tradingDiscipline: "Trading Discipline",
  strategyConsistency: "Strategy Consistency",
  tradingJournalQuality: "Trading Journal Quality",
  profitability: "Profitability",
};
