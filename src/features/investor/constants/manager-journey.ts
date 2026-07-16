export const MANAGER_JOURNEY_STAGES = [
  { id: "application", label: "Application" },
  { id: "trader_evaluation", label: "Trader Evaluation" },
  { id: "strategy_submission", label: "Strategy Submission" },
  { id: "committee_review", label: "Investment Committee Review" },
  { id: "certification", label: "Certification" },
  { id: "approved_manager", label: "Approved Pool Manager" },
  { id: "capital_eligible", label: "Eligible for RyvonX Capital" },
] as const;

export type ManagerJourneyStageId = (typeof MANAGER_JOURNEY_STAGES)[number]["id"];

export function getManagerJourneyProgress(
  enrollmentStatus: string | null | undefined
): { currentStageIndex: number; nextStep: string } {
  switch (enrollmentStatus) {
    case "active":
      return {
        currentStageIndex: 2,
        nextStep: "Complete your trader evaluation",
      };
    case "paid":
    case "awaiting_setup":
      return {
        currentStageIndex: 1,
        nextStep: "Begin trader evaluation",
      };
    case "completed":
      return {
        currentStageIndex: 5,
        nextStep: "Explore RyvonX Capital eligibility",
      };
    case "pending_payment":
      return {
        currentStageIndex: 0,
        nextStep: "Complete your application payment",
      };
    default:
      return {
        currentStageIndex: 0,
        nextStep: "Start your Manager Journey application",
      };
  }
}
