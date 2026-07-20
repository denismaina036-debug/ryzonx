export const PM_EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "experienced", label: "Experienced" },
  { value: "pro_trader", label: "Pro Trader" },
  { value: "elite_trader", label: "Elite Trader" },
] as const;

export const PM_RISK_CLASSIFICATIONS = [
  { value: "conservative", label: "Conservative" },
  { value: "balanced", label: "Balanced" },
  { value: "aggressive", label: "Aggressive" },
  { value: "super_aggressive", label: "Super Aggressive" },
] as const;

export type PmExperienceLevel = (typeof PM_EXPERIENCE_LEVELS)[number]["value"];
export type PmRiskClassification = (typeof PM_RISK_CLASSIFICATIONS)[number]["value"];

export const PM_EXPERIENCE_LEVEL_LABELS: Record<PmExperienceLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  experienced: "Experienced",
  pro_trader: "Pro Trader",
  elite_trader: "Elite Trader",
};

export const PM_RISK_CLASSIFICATION_LABELS: Record<PmRiskClassification, string> = {
  conservative: "Conservative",
  balanced: "Balanced",
  aggressive: "Aggressive",
  super_aggressive: "Super Aggressive",
};

/** Maps admin risk classification to the numeric aggressiveness rating on pool_managers. */
export const PM_RISK_CLASSIFICATION_TO_RATING: Record<PmRiskClassification, number> = {
  conservative: 1.5,
  balanced: 2.5,
  aggressive: 4.0,
  super_aggressive: 5.0,
};

/** Maps onboarding experience assessment to the allowed pool_managers.manager_level values. */
export const PM_EXPERIENCE_TO_MANAGER_LEVEL: Record<PmExperienceLevel, string> = {
  beginner: "verified_pool_manager",
  intermediate: "verified_pool_manager",
  experienced: "professional_pool_manager",
  pro_trader: "professional_pool_manager",
  elite_trader: "elite_pool_manager",
};

export function resolveManagerCareerLevel(experienceLevel?: string): string {
  if (!experienceLevel) return "verified_pool_manager";
  return PM_EXPERIENCE_TO_MANAGER_LEVEL[experienceLevel as PmExperienceLevel] ?? "verified_pool_manager";
}

export function formatPmInitialRatingNotes(
  experienceLevel?: string,
  riskClassification?: string
): string | null {
  const parts: string[] = [];
  if (experienceLevel && PM_EXPERIENCE_LEVEL_LABELS[experienceLevel as PmExperienceLevel]) {
    parts.push(`Experience level: ${PM_EXPERIENCE_LEVEL_LABELS[experienceLevel as PmExperienceLevel]}`);
  }
  if (riskClassification && PM_RISK_CLASSIFICATION_LABELS[riskClassification as PmRiskClassification]) {
    parts.push(
      `Risk classification: ${PM_RISK_CLASSIFICATION_LABELS[riskClassification as PmRiskClassification]}`
    );
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function resolvePmAggressivenessRating(riskClassification?: string): number | null {
  if (!riskClassification) return null;
  return PM_RISK_CLASSIFICATION_TO_RATING[riskClassification as PmRiskClassification] ?? null;
}
