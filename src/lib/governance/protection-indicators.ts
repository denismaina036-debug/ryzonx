import { PROTECTION_INDICATOR } from "@/constants/governance";

type FundGovernanceRow = {
  governance_verified?: boolean;
  governance_approved?: boolean;
  under_governance_review?: boolean;
  on_probation?: boolean;
  pool_health?: string;
  governance_stage?: string;
  is_ryvonx_backed?: boolean;
};

export function buildProtectionIndicators(row: FundGovernanceRow): string[] {
  const indicators: string[] = [];
  if (row.governance_verified) indicators.push(PROTECTION_INDICATOR.RYVONX_VERIFIED);
  if (row.governance_approved) indicators.push(PROTECTION_INDICATOR.GOVERNANCE_APPROVED);
  if (row.under_governance_review) indicators.push(PROTECTION_INDICATOR.CURRENTLY_REVIEWED);
  if (row.on_probation) indicators.push(PROTECTION_INDICATOR.PROBATION);
  if (row.is_ryvonx_backed) indicators.push(PROTECTION_INDICATOR.RYVONX_BACKED);

  const health = row.pool_health ?? "healthy";
  if (health === "healthy" && !row.on_probation) indicators.push(PROTECTION_INDICATOR.HEALTHY);
  else if (health === "watchlist") indicators.push(PROTECTION_INDICATOR.WATCHLIST);
  else if (health === "restricted" || row.governance_stage === "restricted")
    indicators.push(PROTECTION_INDICATOR.RESTRICTED);
  else if (health === "suspended" || row.governance_stage === "suspended")
    indicators.push(PROTECTION_INDICATOR.SUSPENDED);

  return indicators;
}

export function isPoolJoinBlocked(row: FundGovernanceRow & {
  pause_new_investments?: boolean;
  hide_from_marketplace?: boolean;
  lifecycle_status?: string;
  status?: string;
}): string | null {
  if (row.pool_health === "suspended" || row.governance_stage === "suspended") {
    return "This pool has been suspended by RyvonX and is not accepting new investors.";
  }
  if (row.pool_health === "restricted" || row.governance_stage === "restricted") {
    return "This pool is currently restricted by the RyvonX Governance Team.";
  }
  if (row.on_probation && row.pause_new_investments) {
    return "This pool is under probation. New investments are temporarily paused.";
  }
  if (row.pause_new_investments) {
    return "New investments are temporarily paused for this pool.";
  }
  if (row.lifecycle_status && !["live", "approved"].includes(row.lifecycle_status)) {
    return "This pool is not currently accepting new investors.";
  }
  if (row.status && row.status !== "active") {
    return "This pool is not available for new investments.";
  }
  return null;
}
