import { defineEmailTemplate, baseVars } from "./helpers";

const pmVars = [
  { key: "application_status", label: "Application status", sample: "Under Review" },
  { key: "review_notes", label: "Review notes", sample: "Please update your strategy document." },
  { key: "pool_name", label: "Pool name", sample: "Alpha Growth Pool" },
  { key: "manager_name", label: "Manager name", sample: "Jordan Lee" },
];

function pmTemplate(
  slug: string,
  name: string,
  title: string,
  intro: string,
  badge: { label: string; variant: "pending" | "approved" | "rejected" | "under_review" | "completed" | "warning" | "suspended" | "action_required" },
  cta = "Continue Application"
): ReturnType<typeof defineEmailTemplate> {
  return defineEmailTemplate({
    slug,
    name,
    category: "pool_manager",
    description: name,
    subjectTemplate: `${title} — RyvonX Pool Manager`,
    emailSpec: {
      title,
      intro,
      badge,
      blocks: [{ type: "info_card", label: "Status", value: "{{application_status}}" }],
      primaryAction: { label: cta, urlKey: "dashboard_link" },
    },
    variablesSchema: baseVars(pmVars),
    defaultChannels: ["email", "in_app"],
    inAppTitleTemplate: title,
    inAppBodyTemplate: intro,
  });
}

export const POOL_MANAGER_TEMPLATES = [
  pmTemplate("trader_application_received", "Application Submitted", "Application submitted", "Thank you for applying to the RyvonX Pool Manager Program.", { label: "Pending", variant: "pending" }),
  pmTemplate("application_received", "Application Received", "Application received", "We have received your Pool Manager application.", { label: "Under Review", variant: "under_review" }),
  pmTemplate("trader_evaluation_started", "Trader Evaluation Started", "Evaluation started", "Your trader evaluation account has been provisioned.", { label: "Under Review", variant: "under_review" }, "View Journey"),
  pmTemplate("trader_evaluation_passed", "Trader Evaluation Passed", "Evaluation passed", "Congratulations — you passed the RyvonX trader evaluation.", { label: "Approved", variant: "approved" }),
  pmTemplate("trader_evaluation_failed", "Trader Evaluation Failed", "Evaluation update", "Your trader evaluation has concluded. Review feedback from our team.", { label: "Rejected", variant: "rejected" }),
  pmTemplate("strategy_submitted", "Strategy Submitted", "Strategy submitted", "Your trading strategy has been submitted for review.", { label: "Pending", variant: "pending" }),
  pmTemplate("strategy_approved", "Strategy Approved", "Strategy approved", "Your trading strategy has been approved.", { label: "Approved", variant: "approved" }),
  pmTemplate("strategy_requires_changes", "Strategy Requires Changes", "Changes requested", "Your strategy requires updates before approval.", { label: "Action Required", variant: "action_required" }),
  pmTemplate("committee_review", "Committee Review", "Committee review", "Your application is under RyvonX committee review.", { label: "Under Review", variant: "under_review" }),
  pmTemplate("application_approved", "Application Approved", "Application approved", "Welcome to the RyvonX Pool Manager Program.", { label: "Approved", variant: "approved" }, "Open Dashboard"),
  pmTemplate("application_rejected", "Application Rejected", "Application update", "Your Pool Manager application was not approved at this time.", { label: "Rejected", variant: "rejected" }),
  pmTemplate("pool_approved", "Pool Approved", "Pool approved", "Your pool {{pool_name}} has been approved for the marketplace.", { label: "Approved", variant: "approved" }, "View Pool"),
  pmTemplate("pool_suspended", "Pool Suspended", "Pool suspended", "Your pool {{pool_name}} has been suspended pending governance review.", { label: "Suspended", variant: "suspended" }),
  pmTemplate("pool_closed", "Pool Closed", "Pool closed", "Your pool {{pool_name}} has been closed.", { label: "Completed", variant: "completed" }),
  pmTemplate("governance_warning", "Governance Warning", "Governance warning", "A governance warning was issued for {{pool_name}}.", { label: "Warning", variant: "warning" }),
  pmTemplate("governance_review", "Governance Review", "Governance review", "Your pool is under governance review.", { label: "Under Review", variant: "under_review" }),
  pmTemplate("capital_allocation_approved", "Capital Allocation Approved", "Capital allocation approved", "RyvonX capital allocation has been approved for {{pool_name}}.", { label: "Approved", variant: "approved" }),
  pmTemplate("capital_allocation_removed", "Capital Allocation Removed", "Capital allocation removed", "RyvonX capital allocation has been removed from {{pool_name}}.", { label: "Completed", variant: "completed" }),
];
