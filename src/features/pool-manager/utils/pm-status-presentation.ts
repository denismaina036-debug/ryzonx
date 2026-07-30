/** Simplified status labels for pool manager UI. */
export function simplifyStrategyStatus(status: string): string {
  if (status === "submitted" || status === "under_review") return "Pending";
  if (["approved", "available", "operating", "paused"].includes(status)) return "Approved";
  if (status === "draft") return "Draft";
  if (status === "archived") return "Archived";
  return status.replace(/_/g, " ");
}

export function simplifyPoolLifecycleStatus(status: string): string {
  if (status === "submitted" || status === "under_review") return "Pending";
  if (status === "live") return "Live";
  if (status === "draft") return "Draft";
  if (status === "rejected") return "Rejected";
  if (status === "approved") return "Approved";
  if (status === "archived") return "Archived";
  return status.replace(/_/g, " ");
}

export function simplifyCycleStatus(status: string): string {
  const labels: Record<string, string> = {
    funding: "Funding",
    trading: "Trading",
    approved: "Approved",
    submitted: "Pending",
    under_review: "Pending",
    draft: "Draft",
    distribution: "Distribution",
    completed: "Completed",
    archived: "Archived",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

/** Map simplified labels back to a badge status key for styling. */
export function strategyBadgeStatus(status: string): string {
  if (status === "submitted" || status === "under_review") return "pending";
  if (["approved", "available", "operating", "paused"].includes(status)) return "approved";
  return status;
}

export function poolBadgeStatus(status: string): string {
  if (status === "submitted" || status === "under_review") return "pending";
  if (status === "live") return "live";
  if (status === "rejected") return "rejected";
  return status;
}
