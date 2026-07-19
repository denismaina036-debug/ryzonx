/** RyvonX platform service fee — charged only on positive realized trading profits. */
export const PLATFORM_SERVICE_FEE_RATE = 0.025;

export const PLATFORM_SERVICE_FEE_PCT = 2.5;

export const DEFAULT_INVESTOR_SHARE_PCT = 80;

export const DEFAULT_POOL_MANAGER_SHARE_PCT = 20;

export const PROFIT_SETTLEMENT_STATUSES = [
  "calculated",
  "pending_review",
  "confirmed",
  "distributing",
  "completed",
  "cancelled",
] as const;

export type ProfitSettlementStatus = (typeof PROFIT_SETTLEMENT_STATUSES)[number];

export const PROFIT_SETTLEMENT_STATUS_LABELS: Record<ProfitSettlementStatus, string> = {
  calculated: "Calculated",
  pending_review: "Pending Review",
  confirmed: "Confirmed",
  distributing: "Distributing",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const PROFIT_ALLOCATION_STATUSES = ["pending", "transferred", "cancelled"] as const;

export type ProfitAllocationStatus = (typeof PROFIT_ALLOCATION_STATUSES)[number];

export const FINANCIAL_AUDIT_PROFIT_ACTIONS = {
  SETTLEMENT_CALCULATED: "profit_settlement_calculated",
  SETTLEMENT_CONFIRMED: "profit_settlement_confirmed",
  SETTLEMENT_DISTRIBUTED: "profit_settlement_distributed",
  INVESTOR_PROFIT_TRANSFERRED: "investor_profit_transferred",
} as const;
