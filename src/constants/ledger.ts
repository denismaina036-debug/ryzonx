export const LEDGER_ACCOUNT_TYPES = ["asset", "liability", "equity", "revenue", "expense"] as const;
export type LedgerAccountType = (typeof LEDGER_ACCOUNT_TYPES)[number];

export const LEDGER_OWNER_TYPES = [
  "platform",
  "investor",
  "pool_manager",
  "investment_cycle",
  "investment_allocation",
] as const;
export type LedgerOwnerType = (typeof LEDGER_OWNER_TYPES)[number];

export const LEDGER_ENTRY_SIDES = ["debit", "credit"] as const;
export type LedgerEntrySide = (typeof LEDGER_ENTRY_SIDES)[number];

export const LEDGER_TRANSACTION_TYPES = [
  "opening_balance",
  "deposit_credit",
  "allocation_reserve",
  "allocation_settlement",
  "allocation_release",
  "distribution",
  "adjustment",
  "reversal",
  "transfer",
  "profit_settlement",
  "platform_service_fee",
  "pool_manager_earnings",
  "profit_distribution",
] as const;
export type LedgerTransactionType = (typeof LEDGER_TRANSACTION_TYPES)[number];

export const LEDGER_TRANSACTION_STATUSES = ["pending", "posted", "reversed"] as const;
export type LedgerTransactionStatus = (typeof LEDGER_TRANSACTION_STATUSES)[number];

export const SETTLEMENT_BATCH_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
] as const;
export type SettlementBatchStatus = (typeof SETTLEMENT_BATCH_STATUSES)[number];

export const DISTRIBUTION_RECORD_STATUSES = [
  "preparation",
  "batch",
  "pending",
  "approved",
  "completed",
  "cancelled",
] as const;
export type DistributionRecordStatus = (typeof DISTRIBUTION_RECORD_STATUSES)[number];

export const FINANCIAL_ADJUSTMENT_STATUSES = ["pending", "approved", "posted", "rejected"] as const;
export type FinancialAdjustmentStatus = (typeof FINANCIAL_ADJUSTMENT_STATUSES)[number];

export const FINANCIAL_AUDIT_ACTIONS = {
  LEDGER_POSTED: "ledger_transaction_posted",
  LEDGER_REVERSED: "ledger_transaction_reversed",
  SETTLEMENT_BATCH: "settlement_batch_processed",
  DISTRIBUTION_PREPARED: "distribution_prepared",
  DISTRIBUTION_APPROVED: "distribution_approved",
  DISTRIBUTION_COMPLETED: "distribution_completed",
  ADJUSTMENT_CREATED: "financial_adjustment_created",
  ADJUSTMENT_POSTED: "financial_adjustment_posted",
  ALLOCATION_FUNDING_CONFIRMED: "allocation_funding_confirmed",
  ALLOCATION_SETTLED: "allocation_settled",
  ALLOCATION_REJECTED: "allocation_rejected",
} as const;

export const LEDGER_ENTITY_TYPE = "ledger_transaction";

/** Extended allocation statuses for settlement workflow */
export const ALLOCATION_SETTLEMENT_STATUSES = [
  "pending",
  "funding_confirmed",
  "confirmed",
  "settled",
  "locked",
  "distributed",
  "cancelled",
  "rejected",
] as const;

export const PLATFORM_ACCOUNT_CODES = {
  CASH: "PLATFORM_CASH",
  SUSPENSE: "PLATFORM_SUSPENSE",
  EQUITY: "PLATFORM_EQUITY",
  REVENUE: "PLATFORM_REVENUE",
} as const;

export function poolManagerAvailableAccountCode(managerId: string): string {
  return `PM_${managerId.replace(/-/g, "").slice(0, 12).toUpperCase()}_AVAILABLE`;
}

export function poolManagerPendingAccountCode(managerId: string): string {
  return `PM_${managerId.replace(/-/g, "").slice(0, 12).toUpperCase()}_PENDING`;
}

export function cycleProfitPayableAccountCode(cycleId: string): string {
  return `CYCLE_${cycleId.replace(/-/g, "").slice(0, 12).toUpperCase()}_PROFIT_PAYABLE`;
}

export function investorAvailableAccountCode(investorId: string): string {
  return `INVESTOR_${investorId.replace(/-/g, "").slice(0, 12).toUpperCase()}_AVAILABLE`;
}

export function investorReservedAccountCode(investorId: string): string {
  return `INVESTOR_${investorId.replace(/-/g, "").slice(0, 12).toUpperCase()}_RESERVED`;
}

export function investorSettledAccountCode(investorId: string): string {
  return `INVESTOR_${investorId.replace(/-/g, "").slice(0, 12).toUpperCase()}_SETTLED`;
}

export function cycleEscrowAccountCode(cycleId: string): string {
  return `CYCLE_${cycleId.replace(/-/g, "").slice(0, 12).toUpperCase()}_ESCROW`;
}

export function cycleSettledAccountCode(cycleId: string): string {
  return `CYCLE_${cycleId.replace(/-/g, "").slice(0, 12).toUpperCase()}_SETTLED`;
}
