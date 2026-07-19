export const INVESTMENT_ALLOCATION_STATUSES = [
  "pending",
  "funding_confirmed",
  "confirmed",
  "settled",
  "locked",
  "distributed",
  "cancelled",
  "rejected",
] as const;

export type InvestmentAllocationStatus = (typeof INVESTMENT_ALLOCATION_STATUSES)[number];

export const INVESTMENT_ALLOCATION_STATUS_LABELS: Record<
  InvestmentAllocationStatus,
  string
> = {
  pending: "Pending",
  funding_confirmed: "Funding Confirmed",
  confirmed: "Confirmed",
  settled: "Settled",
  locked: "Locked",
  distributed: "Distributed",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

/** Mutable before cycle trading lock */
export const INVESTMENT_ALLOCATION_MUTABLE_STATUSES: InvestmentAllocationStatus[] = [
  "pending",
  "funding_confirmed",
  "confirmed",
];

/** Statuses eligible for ledger settlement */
export const INVESTMENT_ALLOCATION_SETTLEABLE_STATUSES: InvestmentAllocationStatus[] = [
  "funding_confirmed",
];
