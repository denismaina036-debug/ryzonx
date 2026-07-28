export type TransactionDisplayCategory =
  | "deposit"
  | "withdrawal"
  | "pool_investment"
  | "pool_settlement"
  | "profit_distribution"
  | "pool_profit"
  | "pool_loss"
  | "investment_allocation"
  | "adjustment"
  | "reward"
  | "refund"
  | "commission"
  | "bonus";

export type TransactionIconKind =
  | "deposit"
  | "withdrawal"
  | "investment"
  | "settlement"
  | "profit"
  | "loss"
  | "adjustment";

export type TransactionTimelineState = "completed" | "current" | "upcoming" | "failed";

export interface TransactionTimelineStep {
  label: string;
  state: TransactionTimelineState;
}

export interface TransactionDetailField {
  label: string;
  value: string;
  copyable?: boolean;
  mono?: boolean;
}

export interface TransactionPresentationInput {
  id: string;
  type: string;
  amount: number;
  status: string;
  paymentMethod: string | null;
  reference: string | null;
  transactionReference: string | null;
  notes: string | null;
  destination: string | null;
  fundId: string;
  fundName: string;
  cryptoSymbol: string | null;
  cryptoNetwork: string | null;
  cryptoAmount: number | null;
  createdAt: string;
  processedAt: string | null;
  adminNotes?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface TransactionPresentation {
  category: TransactionDisplayCategory;
  title: string;
  subtitle: string;
  iconKind: TransactionIconKind;
  amountPrefix: "+" | "-";
  amountSuffix: string;
  statusLabel: string;
  timeline: TransactionTimelineStep[];
  isCredit: boolean;
}

export interface InvestorTransactionDetail extends TransactionPresentationInput {
  category: TransactionDisplayCategory;
  title: string;
  subtitle: string;
  iconKind: TransactionIconKind;
  amountPrefix: "+" | "-";
  amountSuffix: string;
  statusLabel: string;
  isCredit: boolean;
  displayAmount: string;
  timeline: TransactionTimelineStep[];
  detailFields: TransactionDetailField[];
  walletLabel: string;
  blockchainTxId: string | null;
  poolManagerName: string | null;
  investorSharePct: number | null;
  investmentCycleLabel: string | null;
}
