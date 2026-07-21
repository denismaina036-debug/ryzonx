import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { USER_ROLES } from "@/constants/roles";
import type { ChallengeConfig } from "@/domain/challenge/types";
import {
  CHALLENGE_RULE_PERMISSION,
  CHALLENGE_TEMPLATE_STATUS,
  type ChallengeTemplate,
  type ChallengeTemplateEvaluationCriteria,
  type ChallengeTemplateStatus,
  type ChallengeTemplateTradeRequirements,
  type ChallengeTemplateTradingJournal,
  type ChallengeTemplateTradingRules,
  type ChallengeTemplateUpdateInput,
} from "@/domain/challenge/challenge-template";

type TemplateRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  description: string | null;
  starting_balance: string | number;
  currency: string;
  platform: string;
  default_broker: string;
  profit_target_pct: string | number;
  min_trading_days: number;
  max_evaluation_days: number;
  min_closed_trades: number;
  max_overall_drawdown_pct: string | number;
  max_daily_drawdown_pct: string | number;
  max_risk_per_trade_pct: string | number;
  max_total_exposure_pct: string | number;
  max_simultaneous_positions: number;
  trading_rules: unknown;
  trade_requirements: unknown;
  trading_journal: unknown;
  evaluation_criteria: unknown;
  automatic_failure_conditions: unknown;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function parseTradingRules(raw: unknown): ChallengeTemplateTradingRules {
  const value = (raw ?? {}) as Partial<ChallengeTemplateTradingRules>;
  const fallback = CHALLENGE_RULE_PERMISSION.ALLOWED;
  const notAllowed = CHALLENGE_RULE_PERMISSION.NOT_ALLOWED;
  return {
    weekendHolding: value.weekendHolding ?? fallback,
    newsTrading: value.newsTrading ?? fallback,
    hedging: value.hedging ?? fallback,
    expertAdvisors: value.expertAdvisors ?? notAllowed,
    copyTrading: value.copyTrading ?? notAllowed,
    gridTrading: value.gridTrading ?? notAllowed,
    martingale: value.martingale ?? notAllowed,
  };
}

function parseTradeRequirements(raw: unknown): ChallengeTemplateTradeRequirements {
  const value = (raw ?? {}) as Partial<ChallengeTemplateTradeRequirements>;
  return {
    requireStopLoss: value.requireStopLoss ?? true,
    requireTakeProfit: value.requireTakeProfit ?? true,
    strategyNote: value.strategyNote ?? null,
  };
}

function parseTradingJournal(raw: unknown): ChallengeTemplateTradingJournal {
  const value = (raw ?? {}) as Partial<ChallengeTemplateTradingJournal>;
  return {
    required: value.required ?? true,
    fields: Array.isArray(value.fields) ? value.fields.map(String) : [],
  };
}

function parseEvaluationCriteria(raw: unknown): ChallengeTemplateEvaluationCriteria {
  const value = (raw ?? {}) as Partial<ChallengeTemplateEvaluationCriteria>;
  return {
    riskManagement: toNumber(value.riskManagement),
    tradingDiscipline: toNumber(value.tradingDiscipline),
    strategyConsistency: toNumber(value.strategyConsistency),
    tradingJournalQuality: toNumber(value.tradingJournalQuality),
    profitability: toNumber(value.profitability),
  };
}

function parseFailureConditions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(String);
}

function mapTemplate(row: TemplateRow): ChallengeTemplate {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status as ChallengeTemplateStatus,
    description: row.description,
    startingBalance: toNumber(row.starting_balance),
    currency: row.currency,
    platform: row.platform,
    defaultBroker: row.default_broker,
    profitTargetPct: toNumber(row.profit_target_pct),
    minTradingDays: row.min_trading_days,
    maxEvaluationDays: row.max_evaluation_days,
    minClosedTrades: row.min_closed_trades,
    maxOverallDrawdownPct: toNumber(row.max_overall_drawdown_pct),
    maxDailyDrawdownPct: toNumber(row.max_daily_drawdown_pct),
    maxRiskPerTradePct: toNumber(row.max_risk_per_trade_pct),
    maxTotalExposurePct: toNumber(row.max_total_exposure_pct),
    maxSimultaneousPositions: row.max_simultaneous_positions,
    tradingRules: parseTradingRules(row.trading_rules),
    tradeRequirements: parseTradeRequirements(row.trade_requirements),
    tradingJournal: parseTradingJournal(row.trading_journal),
    evaluationCriteria: parseEvaluationCriteria(row.evaluation_criteria),
    automaticFailureConditions: parseFailureConditions(row.automatic_failure_conditions),
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function templateToChallengeConfig(template: ChallengeTemplate): ChallengeConfig {
  return {
    id: template.id,
    title: template.name,
    profitTargetPct: template.profitTargetPct,
    maxOverallLossPct: template.maxOverallDrawdownPct,
    maxDailyLossPct: template.maxDailyDrawdownPct,
    minTradingDays: template.minTradingDays,
    durationDays: template.maxEvaluationDays,
    minClosedTrades: template.minClosedTrades,
    currency: template.currency,
    platform: template.platform,
    rulesSummary: template.description,
    tradingRules: null,
  };
}

function serializeUpdate(input: ChallengeTemplateUpdateInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) payload.name = input.name;
  if (input.status !== undefined) payload.status = input.status;
  if (input.description !== undefined) payload.description = input.description;
  if (input.startingBalance !== undefined) payload.starting_balance = input.startingBalance;
  if (input.currency !== undefined) payload.currency = input.currency;
  if (input.platform !== undefined) payload.platform = input.platform;
  if (input.defaultBroker !== undefined) payload.default_broker = input.defaultBroker;
  if (input.profitTargetPct !== undefined) payload.profit_target_pct = input.profitTargetPct;
  if (input.minTradingDays !== undefined) payload.min_trading_days = input.minTradingDays;
  if (input.maxEvaluationDays !== undefined) payload.max_evaluation_days = input.maxEvaluationDays;
  if (input.minClosedTrades !== undefined) payload.min_closed_trades = input.minClosedTrades;
  if (input.maxOverallDrawdownPct !== undefined) {
    payload.max_overall_drawdown_pct = input.maxOverallDrawdownPct;
  }
  if (input.maxDailyDrawdownPct !== undefined) {
    payload.max_daily_drawdown_pct = input.maxDailyDrawdownPct;
  }
  if (input.maxRiskPerTradePct !== undefined) {
    payload.max_risk_per_trade_pct = input.maxRiskPerTradePct;
  }
  if (input.maxTotalExposurePct !== undefined) {
    payload.max_total_exposure_pct = input.maxTotalExposurePct;
  }
  if (input.maxSimultaneousPositions !== undefined) {
    payload.max_simultaneous_positions = input.maxSimultaneousPositions;
  }
  if (input.tradingRules !== undefined) payload.trading_rules = input.tradingRules;
  if (input.tradeRequirements !== undefined) payload.trade_requirements = input.tradeRequirements;
  if (input.tradingJournal !== undefined) payload.trading_journal = input.tradingJournal;
  if (input.evaluationCriteria !== undefined) {
    payload.evaluation_criteria = input.evaluationCriteria;
  }
  if (input.automaticFailureConditions !== undefined) {
    payload.automatic_failure_conditions = input.automaticFailureConditions;
  }

  return payload;
}

export const challengeTemplateService = {
  async listActive(): Promise<ChallengeTemplate[]> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("challenge_templates")
      .select("*")
      .eq("status", CHALLENGE_TEMPLATE_STATUS.ACTIVE)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);
    return ((data ?? []) as TemplateRow[]).map(mapTemplate);
  },

  async listAll(): Promise<ChallengeTemplate[]> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const { data, error } = await db
      .from("challenge_templates")
      .select("*")
      .order("is_default", { ascending: false })
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);
    return ((data ?? []) as TemplateRow[]).map(mapTemplate);
  },

  async getById(id: string): Promise<ChallengeTemplate | null> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("challenge_templates")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? mapTemplate(data as TemplateRow) : null;
  },

  async getDefault(): Promise<ChallengeTemplate | null> {
    const db = createAdminClient();
    const { data, error } = await db
      .from("challenge_templates")
      .select("*")
      .eq("is_default", true)
      .eq("status", CHALLENGE_TEMPLATE_STATUS.ACTIVE)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (data) return mapTemplate(data as TemplateRow);

    const { data: fallback } = await db
      .from("challenge_templates")
      .select("*")
      .eq("status", CHALLENGE_TEMPLATE_STATUS.ACTIVE)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    return fallback ? mapTemplate(fallback as TemplateRow) : null;
  },

  async update(id: string, input: ChallengeTemplateUpdateInput): Promise<ChallengeTemplate> {
    await requireRole(USER_ROLES.ADMINISTRATOR);
    const db = createAdminClient();
    const payload = serializeUpdate(input);

    if (Object.keys(payload).length === 0) {
      const existing = await this.getById(id);
      if (!existing) throw new Error("Template not found.");
      return existing;
    }

    const { data, error } = await db
      .from("challenge_templates")
      .update(payload as never)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Update failed.");
    return mapTemplate(data as TemplateRow);
  },
};
