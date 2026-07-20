export interface PmAdmissionSettings {
  tradingChallengeFee: number;
  directAccessFee: number;
  challengeInstructions: string;
  challengeRules: string;
  challengeRequirements: string;
  challengePassingCriteria: string;
  challengeDurationDays: number;
  challengeProfitTargetPct: number;
  challengeMaxDrawdownPct: number;
  challengeDailyDrawdownPct: number;
  challengeJournalRequired: boolean;
  challengeDocumentation: string;
}

export const DEFAULT_PM_ADMISSION_SETTINGS: PmAdmissionSettings = {
  tradingChallengeFee: 150,
  directAccessFee: 200,
  challengeInstructions:
    "Complete the evaluation challenge using the account credentials provided by RyvonX administration. Maintain a complete trading journal throughout the challenge period.",
  challengeRules:
    "Follow all challenge rules provided by the administrator. No hedging across accounts. No copy trading unless explicitly permitted.",
  challengeRequirements:
    "Complete the evaluation, maintain a complete trading journal, follow challenge rules, and meet performance objectives.",
  challengePassingCriteria:
    "Meet profit target without breaching maximum drawdown limits within the challenge duration.",
  challengeDurationDays: 30,
  challengeProfitTargetPct: 8,
  challengeMaxDrawdownPct: 10,
  challengeDailyDrawdownPct: 5,
  challengeJournalRequired: true,
  challengeDocumentation:
    "Document every trade in the Challenge Journal with entry rationale, management notes, and outcomes.",
};

export function parsePmAdmissionSettings(raw: unknown): PmAdmissionSettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_PM_ADMISSION_SETTINGS };
  }
  const o = raw as Record<string, unknown>;
  return {
    tradingChallengeFee: toNum(o.tradingChallengeFee, DEFAULT_PM_ADMISSION_SETTINGS.tradingChallengeFee),
    directAccessFee: toNum(o.directAccessFee, DEFAULT_PM_ADMISSION_SETTINGS.directAccessFee),
    challengeInstructions: str(o.challengeInstructions, DEFAULT_PM_ADMISSION_SETTINGS.challengeInstructions),
    challengeRules: str(o.challengeRules, DEFAULT_PM_ADMISSION_SETTINGS.challengeRules),
    challengeRequirements: str(o.challengeRequirements, DEFAULT_PM_ADMISSION_SETTINGS.challengeRequirements),
    challengePassingCriteria: str(o.challengePassingCriteria, DEFAULT_PM_ADMISSION_SETTINGS.challengePassingCriteria),
    challengeDurationDays: toNum(o.challengeDurationDays, DEFAULT_PM_ADMISSION_SETTINGS.challengeDurationDays),
    challengeProfitTargetPct: toNum(o.challengeProfitTargetPct, DEFAULT_PM_ADMISSION_SETTINGS.challengeProfitTargetPct),
    challengeMaxDrawdownPct: toNum(o.challengeMaxDrawdownPct, DEFAULT_PM_ADMISSION_SETTINGS.challengeMaxDrawdownPct),
    challengeDailyDrawdownPct: toNum(o.challengeDailyDrawdownPct, DEFAULT_PM_ADMISSION_SETTINGS.challengeDailyDrawdownPct),
    challengeJournalRequired: o.challengeJournalRequired !== false,
    challengeDocumentation: str(o.challengeDocumentation, DEFAULT_PM_ADMISSION_SETTINGS.challengeDocumentation),
  };
}

function toNum(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}
