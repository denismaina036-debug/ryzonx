import type { RatingCategory } from "@/constants/rating";
import type { RatingProfileRules } from "@/domain/performance-intelligence/types";
import { RATING_CATEGORY_LABELS } from "@/constants/rating";

export interface IntelligenceMetrics {
  closedTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  openPositions: number;
  totalTrades: number;
  snapshotCount: number;
  journalEventCount: number;
  operationalFlags: number;
  governanceViolations: number;
  governanceStage: string;
  completedCycles: number;
  totalCycles: number;
  completionRate: number;
  totalRaisedCapital: number;
  totalInvestors: number;
  fundingSuccessRate: number;
  averageCycleDurationDays: number | null;
  currentExposure: number;
  maxDrawdownPct: number | null;
}

export interface IntelligenceMetrics {
  closedTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  openPositions: number;
  totalTrades: number;
  snapshotCount: number;
  journalEventCount: number;
  operationalFlags: number;
  governanceViolations: number;
  governanceStage: string;
  completedCycles: number;
  totalCycles: number;
  completionRate: number;
  totalRaisedCapital: number;
  totalInvestors: number;
  fundingSuccessRate: number;
  averageCycleDurationDays: number | null;
  currentExposure: number;
  maxDrawdownPct: number | null;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function gradeFromScore(score: number, rules: RatingProfileRules): string {
  const bands = rules.gradeBands ?? [
    { min: 90, grade: "A" },
    { min: 80, grade: "B" },
    { min: 70, grade: "C" },
    { min: 60, grade: "D" },
    { min: 0, grade: "F" },
  ];
  for (const band of bands.sort((a, b) => b.min - a.min)) {
    if (score >= band.min) return band.grade;
  }
  return "F";
}

export function scoreToStars(score: number, rules: RatingProfileRules): number {
  const scale = rules.starScale ?? { minScore: 0, maxScore: 100, minStars: 1, maxStars: 5 };
  const ratio = (score - scale.minScore) / (scale.maxScore - scale.minScore);
  const stars = scale.minStars + ratio * (scale.maxStars - scale.minStars);
  return Math.round(stars * 10) / 10;
}

export function computeCategoryScores(
  metrics: IntelligenceMetrics,
  rules: RatingProfileRules
): Record<RatingCategory, { score: number; explanation: string }> {
  const cr = rules.categoryRules ?? {};

  const tp = cr.trading_performance ?? { minClosedTrades: 3, winRateWeight: 0.7, activityWeight: 0.3 };
  const activityScore = clamp((metrics.totalTrades / Math.max(tp.minClosedTrades as number, 1)) * 50);
  const tradingScore = clamp(
    metrics.winRate * 100 * (tp.winRateWeight as number) +
      activityScore * (tp.activityWeight as number)
  );
  const tradingExplanation =
    metrics.closedTrades >= (tp.minClosedTrades as number)
      ? `Win rate ${(metrics.winRate * 100).toFixed(0)}% across ${metrics.closedTrades} closed trades.`
      : `Limited trade history (${metrics.closedTrades} closed). Score reflects available operational data.`;

  const rm = cr.risk_management ?? { exposureRatioPenalty: 0.5, openPositionPenalty: 5 };
  const exposureRatio =
    metrics.totalRaisedCapital > 0 ? metrics.currentExposure / metrics.totalRaisedCapital : 0;
  const riskScore = clamp(
    100 - exposureRatio * 100 * (rm.exposureRatioPenalty as number) -
      metrics.openPositions * (rm.openPositionPenalty as number)
  );
  const riskExplanation = `Exposure ratio ${(exposureRatio * 100).toFixed(1)}% with ${metrics.openPositions} open positions.`;

  const co = cr.consistency ?? { completionWeight: 0.5, snapshotWeight: 0.3, cycleStabilityWeight: 0.2 };
  const snapshotScore = clamp(metrics.snapshotCount * 10);
  const consistencyScore = clamp(
    metrics.completionRate * 100 * (co.completionWeight as number) +
      snapshotScore * (co.snapshotWeight as number) +
      (metrics.totalCycles > 1 ? 70 : 50) * (co.cycleStabilityWeight as number)
  );
  const consistencyExplanation = `${(metrics.completionRate * 100).toFixed(0)}% cycle completion with ${metrics.snapshotCount} operational snapshots.`;

  const cp = cr.capital_preservation ?? { winLossRatioWeight: 0.6, drawdownWeight: 0.4 };
  const winLossRatio =
    metrics.losingTrades > 0
      ? metrics.winningTrades / metrics.losingTrades
      : metrics.winningTrades > 0
        ? 2
        : 0.5;
  const drawdownPenalty = metrics.maxDrawdownPct != null ? metrics.maxDrawdownPct : 0;
  const preservationScore = clamp(
    Math.min(winLossRatio / 2, 1) * 100 * (cp.winLossRatioWeight as number) +
      clamp(100 - drawdownPenalty * 2) * (cp.drawdownWeight as number)
  );
  const preservationExplanation = `Win/loss ratio ${winLossRatio.toFixed(2)}${metrics.maxDrawdownPct != null ? `, max drawdown ${metrics.maxDrawdownPct.toFixed(1)}%` : ""}.`;

  const gv = cr.governance ?? { violationPenalty: 15, flagPenalty: 10, reviewBonus: 5 };
  const stagePenalty: Record<string, number> = {
    suspended: 40,
    restricted: 30,
    probation: 20,
    warning: 15,
    performance_monitoring: 5,
  };
  const governanceScore = clamp(
    100 -
      metrics.governanceViolations * (gv.violationPenalty as number) -
      metrics.operationalFlags * (gv.flagPenalty as number) -
      (stagePenalty[metrics.governanceStage] ?? 0)
  );
  const governanceExplanation = `Governance stage "${metrics.governanceStage}" with ${metrics.governanceViolations} violations and ${metrics.operationalFlags} operational flags.`;

  const od = cr.operational_discipline ?? { journalWeight: 0.4, snapshotWeight: 0.3, timelineWeight: 0.3 };
  const journalScore = clamp(Math.min(metrics.journalEventCount * 5, 100));
  const operationalScore = clamp(
    journalScore * (od.journalWeight as number) +
      snapshotScore * (od.snapshotWeight as number) +
      clamp(metrics.totalTrades * 8) * (od.timelineWeight as number)
  );
  const operationalExplanation = `${metrics.journalEventCount} journal events and ${metrics.snapshotCount} snapshots recorded.`;

  const ic = cr.investor_confidence ?? { fundingWeight: 0.5, participationWeight: 0.5 };
  const participationScore = clamp(Math.min(metrics.totalInvestors * 5, 100));
  const confidenceScore = clamp(
    metrics.fundingSuccessRate * 100 * (ic.fundingWeight as number) +
      participationScore * (ic.participationWeight as number)
  );
  const confidenceExplanation = `${metrics.totalInvestors} investors across cycles with ${(metrics.fundingSuccessRate * 100).toFixed(0)}% funding success.`;

  return {
    trading_performance: { score: tradingScore, explanation: tradingExplanation },
    risk_management: { score: riskScore, explanation: riskExplanation },
    consistency: { score: consistencyScore, explanation: consistencyExplanation },
    capital_preservation: { score: preservationScore, explanation: preservationExplanation },
    governance: { score: governanceScore, explanation: governanceExplanation },
    operational_discipline: { score: operationalScore, explanation: operationalExplanation },
    investor_confidence: { score: confidenceScore, explanation: confidenceExplanation },
  };
}

export function computeWeightedRating(
  categoryScores: Record<string, { score: number; explanation: string }>,
  weights: Array<{ category: string; label: string; weight: number }>
): {
  overallScore: number;
  breakdown: Array<{
    category: string;
    label: string;
    score: number;
    weight: number;
    weightedContribution: number;
    explanation: string;
  }>;
} {
  let totalWeight = 0;
  let weightedSum = 0;
  const breakdown = weights.map((w) => {
    const entry = categoryScores[w.category] ?? { score: 50, explanation: "Insufficient data." };
    const contribution = entry.score * w.weight;
    totalWeight += w.weight;
    weightedSum += contribution;
    return {
      category: w.category,
      label: w.label,
      score: entry.score,
      weight: w.weight,
      weightedContribution: contribution,
      explanation: entry.explanation,
    };
  });

  const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 50;
  return { overallScore: clamp(overallScore), breakdown };
}

export function deriveGrades(
  overallScore: number,
  categoryScores: Record<string, { score: number; explanation: string }>,
  rules: RatingProfileRules
): {
  performanceGrade: string;
  riskGrade: string;
  governanceGrade: string;
  consistencyScore: number;
  operationalScore: number;
  confidenceScore: number;
} {
  return {
    performanceGrade: gradeFromScore(categoryScores.trading_performance?.score ?? overallScore, rules),
    riskGrade: gradeFromScore(categoryScores.risk_management?.score ?? overallScore, rules),
    governanceGrade: gradeFromScore(categoryScores.governance?.score ?? overallScore, rules),
    consistencyScore: categoryScores.consistency?.score ?? 0,
    operationalScore: categoryScores.operational_discipline?.score ?? 0,
    confidenceScore: categoryScores.investor_confidence?.score ?? 0,
  };
}

export function deriveTrend(
  previousScore: number | null,
  newScore: number
): "up" | "down" | "stable" {
  if (previousScore == null) return "stable";
  const delta = newScore - previousScore;
  if (delta > 1) return "up";
  if (delta < -1) return "down";
  return "stable";
}

export function deriveStrengthsAndImprovements(
  breakdown: Array<{ label: string; score: number; explanation: string }>
): { strengths: string[]; improvements: string[] } {
  const sorted = [...breakdown].sort((a, b) => b.score - a.score);
  const strengths = sorted
    .filter((b) => b.score >= 75)
    .slice(0, 3)
    .map((b) => `${b.label}: ${b.explanation}`);
  const improvements = sorted
    .filter((b) => b.score < 65)
    .slice(-3)
    .reverse()
    .map((b) => `${b.label}: ${b.explanation}`);
  return { strengths, improvements };
}

export { gradeFromScore, RATING_CATEGORY_LABELS };
