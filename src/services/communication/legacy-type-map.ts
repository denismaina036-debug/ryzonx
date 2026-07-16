/** Maps legacy in-app notification types to communication template slugs. */
export const LEGACY_TYPE_TO_TEMPLATE_SLUG: Record<string, string> = {
  pool_governance_violation: "governance_violation",
  pool_governance_warning: "governance_warning",
  pool_governance_restricted: "pool_restricted",
  pool_governance_suspended: "pool_suspended",
  pool_governance_reactivated: "pool_restored",
  pool_governance_probation: "governance_probation",
  pool_governance_review: "governance_review",
  capital_review_scheduled: "capital_review_scheduled",
  capital_allocation_approved: "capital_allocation_approved",
  capital_allocation_increased: "capital_allocation_increased",
  capital_allocation_reduced: "capital_allocation_reduced",
  capital_allocation_removed: "capital_allocation_removed",
  pm_application_submitted: "trader_application_received",
  pm_application_approved: "application_approved",
  pm_application_rejected: "application_rejected",
  pm_strategy_changes: "strategy_requires_changes",
  pm_interview_scheduled: "committee_review",
  pm_challenge_started: "trader_evaluation_started",
  pm_pool_approved: "pool_approved",
  pm_pool_suspended: "pool_suspended",
  pm_pool_closed: "pool_closed",
  admin_message: "admin_platform_alert",
  pool_trading: "investment_updated",
  pool_invitation: "pool_invitation",
  manager_promotion_achieved: "manager_promotion",
  manager_achievement_awarded: "manager_achievement",
  content_approved: "content_approved",
  content_rejected: "content_rejected",
};

export function legacyTypeToTemplateSlug(type: string): string {
  return LEGACY_TYPE_TO_TEMPLATE_SLUG[type] ?? "admin_platform_alert";
}
