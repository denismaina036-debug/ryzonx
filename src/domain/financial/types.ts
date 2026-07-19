import type {
  DistributionRecordStatus,
  FinancialAdjustmentStatus,
  LedgerAccountType,
  LedgerEntrySide,
  LedgerOwnerType,
  LedgerTransactionStatus,
  LedgerTransactionType,
  SettlementBatchStatus,
} from "@/constants/ledger";

export interface LedgerAccount {
  id: string;
  code: string;
  name: string;
  accountType: LedgerAccountType;
  ownerType: LedgerOwnerType;
  ownerId: string | null;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerTransaction {
  id: string;
  reference: string;
  description: string;
  transactionType: LedgerTransactionType;
  status: LedgerTransactionStatus;
  sourceType: string | null;
  sourceId: string | null;
  actorId: string | null;
  metadata: Record<string, unknown>;
  postedAt: string;
  reversedAt: string | null;
  reversalTransactionId: string | null;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  transactionId: string;
  accountId: string;
  entrySide: LedgerEntrySide;
  amount: number;
  currency: string;
  memo: string | null;
  createdAt: string;
}

export interface SettlementBatch {
  id: string;
  batchReference: string;
  investmentCycleId: string | null;
  status: SettlementBatchStatus;
  totalAmount: number;
  allocationCount: number;
  ledgerTransactionId: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DistributionRecord {
  id: string;
  distributionBatchId: string | null;
  investmentCycleId: string;
  investmentAllocationId: string;
  investorId: string;
  amount: number;
  currency: string;
  status: DistributionRecordStatus;
  ledgerTransactionId: string | null;
  notes: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialAdjustment {
  id: string;
  adjustmentReference: string;
  reason: string;
  amount: number;
  currency: string;
  debitAccountId: string;
  creditAccountId: string;
  status: FinancialAdjustmentStatus;
  ledgerTransactionId: string | null;
  createdBy: string;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WalletProjection {
  available: number;
  reserved: number;
  pending: number;
  settled: number;
  currency: string;
  source: "ledger" | "legacy";
}

export interface InvestorFinancialView {
  wallet: WalletProjection;
  settlementStatus: Record<string, string>;
  distributionStatus: Array<{ cycleName: string; status: string; amount: number }>;
  timeline: Array<{ label: string; occurredAt: string; amount?: number }>;
}

export interface FinancialStatementLine {
  label: string;
  amount: number;
  reference?: string;
}

export interface FinancialStatement {
  title: string;
  periodLabel: string;
  generatedAt: string;
  lines: FinancialStatementLine[];
  openingBalance: number;
  closingBalance: number;
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountType: LedgerAccountType;
  debitTotal: number;
  creditTotal: number;
  balance: number;
}

export interface LedgerIntegrityReport {
  trialBalance: TrialBalanceRow[];
  isBalanced: boolean;
  orphanEntries: number;
  mismatchedTransactions: string[];
  settlementPending: number;
  distributionPending: number;
}

export interface AdminFinancialOperationsView {
  settlementQueue: SettlementBatch[];
  distributionQueue: DistributionRecord[];
  recentTransactions: LedgerTransaction[];
  health: {
    ledgerBalanced: boolean;
    outstandingAdjustments: number;
    pendingSettlements: number;
    pendingDistributions: number;
  };
  batchHistory: SettlementBatch[];
}

export interface ProfitSettlement {
  id: string;
  investmentCycleId: string;
  fundId: string | null;
  poolManagerId: string;
  cycleCapital: number;
  grossTradingProfit: number;
  platformServiceFeePct: number;
  platformServiceFee: number;
  netDistributableProfit: number;
  investorSharePct: number;
  poolManagerSharePct: number;
  investorDistributionTotal: number;
  poolManagerEarnings: number;
  status: string;
  settlementDate: string | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
  distributedAt: string | null;
  settlementLedgerTransactionId: string | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfitSettlementAllocation {
  id: string;
  profitSettlementId: string;
  investmentAllocationId: string;
  investorId: string;
  capitalBasis: number;
  ownershipPct: number;
  profitShare: number;
  status: string;
  ledgerTransactionId: string | null;
  transferredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PoolManagerFinancialDashboard {
  totalEarnings: number;
  availableBalance: number;
  pendingDistribution: number;
  transferredToInvestors: number;
  withdrawn: number;
  platformFeesPaid: number;
  lifetimeEarnings: number;
  cycleSummaries: Array<{
    cycleId: string;
    cycleName: string;
    settlement: ProfitSettlement | null;
  }>;
  transactions: PoolManagerFinancialTransaction[];
}

export interface PoolManagerFinancialTransaction {
  id: string;
  type: string;
  label: string;
  amount: number;
  currency: string;
  occurredAt: string;
  cycleId?: string;
  cycleName?: string;
  reference?: string;
}

export interface PlatformRevenueSummary {
  totalServiceFeesEarned: number;
  dailyRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  byPool: Array<{ fundId: string; fundName: string; amount: number }>;
  byManager: Array<{ managerId: string; managerName: string; amount: number }>;
  byCycle: Array<{ cycleId: string; cycleName: string; amount: number }>;
  recentEntries: Array<{
    id: string;
    amount: number;
    recordedAt: string;
    cycleId: string;
    fundId: string | null;
  }>;
}
