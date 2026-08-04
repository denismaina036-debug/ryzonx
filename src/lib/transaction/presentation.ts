import { DEFAULT_FUND_ID } from "@/constants/funds";
import type {
  TransactionDetailField,
  TransactionDisplayCategory,
  TransactionIconKind,
  TransactionPresentation,
  TransactionPresentationInput,
  TransactionTimelineStep,
  InvestorTransactionDetail,
} from "@/domain/transaction/types";
import { formatCurrency } from "@/lib/utils";
import { formatCryptoAmount } from "@/lib/crypto/usd-conversion";

const FUNDING_WALLET_LABEL = "RyvonX Funding Wallet";

function normalizeStatus(status: string): string {
  const map: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    completed: "Completed",
    rejected: "Rejected",
    cancelled: "Cancelled",
    processing: "Processing",
    failed: "Failed",
  };
  return map[status.toLowerCase()] ?? status.charAt(0).toUpperCase() + status.slice(1);
}

function isLikelyBlockchainHash(value: string | null | undefined): boolean {
  if (!value) return false;
  if (value.startsWith("RVX-")) return false;
  return /^0x[a-fA-F0-9]{40,}$/.test(value) || /^[a-fA-F0-9]{32,}$/.test(value);
}

function readMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string
): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function resolveWalletLabel(input: TransactionPresentationInput): string {
  if (input.cryptoSymbol && input.cryptoNetwork) {
    return `${input.cryptoSymbol} • ${input.cryptoNetwork}`;
  }
  if (input.fundId === DEFAULT_FUND_ID) {
    return FUNDING_WALLET_LABEL;
  }
  return input.fundName;
}

export function resolveTransactionCategory(input: {
  type: string;
  paymentMethod: string | null;
  notes: string | null;
  amount?: number;
}): TransactionDisplayCategory {
  const type = input.type.toLowerCase();
  const method = (input.paymentMethod ?? "").toLowerCase();
  const notes = (input.notes ?? "").toLowerCase();

  if (type === "deposit") return "deposit";
  if (type === "withdrawal") return "withdrawal";
  if (method === "pool_allocation") return "pool_investment";
  if (method === "profit_reinvest") return "pool_investment";
  if (method === "pool_exit") return "pool_settlement";
  if (method === "cycle_profit") return "pool_profit";
  if (method === "profit_transfer") return "profit_distribution";
  if (method === "trade_profit") return notes.includes("loss") ? "pool_loss" : "pool_profit";
  if (method === "pm_admission_fee" || method === "challenge_fee") return "commission";
  if (method === "reward") return "reward";
  if (method === "refund") return "refund";
  if (method === "bonus") return "bonus";
  if (type === "adjustment") return "adjustment";
  return "adjustment";
}

const CATEGORY_TITLES: Record<TransactionDisplayCategory, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  pool_investment: "Pool Investment",
  pool_settlement: "Pool Settlement",
  profit_distribution: "Profit Distribution",
  pool_profit: "Profit",
  pool_loss: "Pool Loss",
  investment_allocation: "Investment Allocation",
  adjustment: "Adjustment",
  reward: "Reward",
  refund: "Refund",
  commission: "Commission",
  bonus: "Bonus",
};

const CATEGORY_ICONS: Record<TransactionDisplayCategory, TransactionIconKind> = {
  deposit: "deposit",
  withdrawal: "withdrawal",
  pool_investment: "investment",
  pool_settlement: "settlement",
  profit_distribution: "profit",
  pool_profit: "profit",
  pool_loss: "loss",
  investment_allocation: "investment",
  adjustment: "adjustment",
  reward: "adjustment",
  refund: "adjustment",
  commission: "adjustment",
  bonus: "adjustment",
};

function resolveSubtitle(
  category: TransactionDisplayCategory,
  input: TransactionPresentationInput
): string {
  if (category === "deposit" || category === "withdrawal") {
    return resolveWalletLabel(input);
  }
  if (
    category === "pool_investment" ||
    category === "pool_settlement" ||
    category === "profit_distribution" ||
    category === "pool_profit" ||
    category === "pool_loss"
  ) {
    return input.fundName;
  }
  if (category === "commission" || category === "adjustment") {
    return input.notes?.split("—")[0]?.trim() || resolveWalletLabel(input);
  }
  return input.fundName;
}

function resolveAmountPresentation(
  category: TransactionDisplayCategory,
  input: TransactionPresentationInput
): { prefix: "+" | "-"; suffix: string; isCredit: boolean } {
  const currency =
    input.cryptoSymbol ??
    readMetadataString(input.metadata ?? null, "currency") ??
    "USDT";

  switch (category) {
    case "deposit":
      return { prefix: "+", suffix: "USD", isCredit: true };
    case "profit_distribution":
    case "pool_profit":
    case "refund":
    case "reward":
    case "bonus":
    case "pool_settlement":
      return { prefix: "+", suffix: currency, isCredit: true };
    case "withdrawal":
    case "pool_investment":
    case "pool_loss":
    case "commission":
      return { prefix: "-", suffix: currency, isCredit: false };
    case "adjustment":
    case "investment_allocation":
    default:
      return { prefix: "-", suffix: currency, isCredit: false };
  }
}

export function buildTransactionTimeline(status: string): TransactionTimelineStep[] {
  const normalized = status.toLowerCase();

  if (normalized === "rejected" || normalized === "failed") {
    return [
      { label: "Created", state: "completed" },
      { label: "Waiting Approval", state: "completed" },
      { label: normalized === "failed" ? "Failed" : "Rejected", state: "failed" },
    ];
  }

  if (normalized === "cancelled") {
    return [
      { label: "Created", state: "completed" },
      { label: "Cancelled", state: "failed" },
    ];
  }

  if (normalized === "pending") {
    return [
      { label: "Created", state: "completed" },
      { label: "Waiting Approval", state: "current" },
      { label: "Processing", state: "upcoming" },
      { label: "Completed", state: "upcoming" },
    ];
  }

  if (normalized === "approved" || normalized === "processing") {
    return [
      { label: "Created", state: "completed" },
      { label: "Submitted", state: "completed" },
      { label: "Processing", state: "current" },
      { label: "Completed", state: "upcoming" },
    ];
  }

  return [
    { label: "Created", state: "completed" },
    { label: "Submitted", state: "completed" },
    { label: "Processing", state: "completed" },
    { label: "Completed", state: "completed" },
  ];
}

export function buildTransactionPresentation(
  input: TransactionPresentationInput
): TransactionPresentation {
  const category = resolveTransactionCategory(input);
  const amountMeta = resolveAmountPresentation(category, input);

  return {
    category,
    title: CATEGORY_TITLES[category],
    subtitle: resolveSubtitle(category, input),
    iconKind: CATEGORY_ICONS[category],
    amountPrefix: amountMeta.prefix,
    amountSuffix: amountMeta.suffix,
    statusLabel: normalizeStatus(input.status),
    timeline: buildTransactionTimeline(input.status),
    isCredit: amountMeta.isCredit,
  };
}

function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

function resolveBlockchainTxId(input: TransactionPresentationInput): string | null {
  const fromMeta = readMetadataString(input.metadata ?? null, "blockchain_txid");
  if (fromMeta) return fromMeta;
  if (isLikelyBlockchainHash(input.reference)) return input.reference;
  return null;
}

function resolveTransactionId(input: TransactionPresentationInput): string {
  return input.transactionReference ?? input.id;
}

function optionalField(
  label: string,
  value: string | null | undefined,
  options?: { copyable?: boolean; mono?: boolean }
): TransactionDetailField | null {
  if (!value?.trim()) return null;
  return {
    label,
    value: value.trim(),
    copyable: options?.copyable,
    mono: options?.mono ?? options?.copyable,
  };
}

export function buildTransactionDetailFields(
  input: TransactionPresentationInput,
  extras?: {
    poolManagerName?: string | null;
    investorSharePct?: number | null;
    investmentCycleLabel?: string | null;
  }
): TransactionDetailField[] {
  const category = resolveTransactionCategory(input);
  const txId = resolveTransactionId(input);
  const { date, time } = formatDateTime(input.createdAt);
  const blockchainTxId = resolveBlockchainTxId(input);
  const walletLabel = resolveWalletLabel(input);
  const currency =
    input.cryptoSymbol ??
    readMetadataString(input.metadata ?? null, "currency") ??
    "USDT";
  const fields: TransactionDetailField[] = [
    { label: "Transaction ID", value: txId, copyable: true, mono: true },
  ];

  const push = (field: TransactionDetailField | null) => {
    if (field) fields.push(field);
  };

  if (category === "deposit") {
    push(optionalField("Blockchain TXID", blockchainTxId, { copyable: true, mono: true }));
    push(
      optionalField(
        "Network",
        input.cryptoNetwork ?? readMetadataString(input.metadata ?? null, "network")
      )
    );
    fields.push({ label: "Wallet", value: walletLabel });
    push(
      optionalField(
        "Deposit Address",
        readMetadataString(input.metadata ?? null, "deposit_address"),
        { copyable: true, mono: true }
      )
    );
    fields.push(
      { label: "Currency", value: "USD" },
      { label: "Date", value: date },
      { label: "Time", value: time },
      { label: "Status", value: normalizeStatus(input.status) }
    );
    if (
      input.cryptoSymbol &&
      input.cryptoAmount != null &&
      input.cryptoAmount > 0 &&
      input.cryptoSymbol !== "USD"
    ) {
      fields.splice(fields.length - 3, 0, {
        label: "Crypto to send (estimate)",
        value: `${formatCryptoAmount(input.cryptoAmount, input.cryptoSymbol)} ${input.cryptoSymbol}`,
      });
    }
    return fields;
  }

  if (category === "withdrawal") {
    push(
      optionalField(
        "Wallet Address",
        input.destination ?? readMetadataString(input.metadata ?? null, "wallet_address"),
        { copyable: true, mono: true }
      )
    );
    push(
      optionalField(
        "Network",
        input.cryptoNetwork ?? readMetadataString(input.metadata ?? null, "network")
      )
    );
    push(
      optionalField(
        "Withdrawal Fee",
        readMetadataString(input.metadata ?? null, "withdrawal_fee")
      )
    );
    fields.push(
      { label: "Currency", value: currency },
      { label: "Date", value: date },
      { label: "Time", value: time },
      { label: "Status", value: normalizeStatus(input.status) }
    );
    push(
      optionalField(
        "Reference Number",
        input.reference && !isLikelyBlockchainHash(input.reference)
          ? input.reference
          : readMetadataString(input.metadata ?? null, "reference_number"),
        { copyable: true, mono: true }
      )
    );
    return fields;
  }

  if (category === "pool_investment") {
    fields.push(
      { label: "Pool Name", value: input.fundName },
      { label: "Pool Manager", value: extras?.poolManagerName ?? "—" }
    );
    if (extras?.investorSharePct != null) {
      fields.push({
        label: "Investor Share",
        value: `${extras.investorSharePct.toFixed(2)}%`,
      });
    }
    push(optionalField("Investment Cycle", extras?.investmentCycleLabel));
    fields.push(
      { label: "Investment Date", value: date },
      { label: "Status", value: normalizeStatus(input.status) }
    );
    return fields;
  }

  if (category === "profit_distribution") {
    fields.push(
      { label: "Pool Name", value: input.fundName },
      {
        label: "Cycle",
        value:
          extras?.investmentCycleLabel ??
          readMetadataString(input.metadata ?? null, "cycle") ??
          "—",
      }
    );
    if (extras?.investorSharePct != null) {
      fields.push({
        label: "Investor Share",
        value: `${extras.investorSharePct.toFixed(2)}%`,
      });
    }
    fields.push({
      label: "Settlement Date",
      value: input.processedAt ? formatDateTime(input.processedAt).date : date,
    });
    push(
      optionalField(
        "Reference Number",
        input.reference && !isLikelyBlockchainHash(input.reference)
          ? input.reference
          : txId,
        { copyable: true, mono: true }
      )
    );
    return fields;
  }

  fields.push(
    { label: "Currency", value: currency },
    { label: "Date", value: date },
    { label: "Time", value: time },
    { label: "Status", value: normalizeStatus(input.status) }
  );
  push(optionalField("Pool", input.fundName));
  return fields;
}

export function buildInvestorTransactionDetail(
  input: TransactionPresentationInput,
  extras?: {
    poolManagerName?: string | null;
    investorSharePct?: number | null;
    investmentCycleLabel?: string | null;
  }
): InvestorTransactionDetail {
  const presentation = buildTransactionPresentation(input);
  const detailFields = buildTransactionDetailFields(input, extras);
  const displayAmount = `${presentation.amountPrefix}${formatCurrency(input.amount)}`;

  return {
    ...input,
    ...presentation,
    displayAmount,
    detailFields,
    walletLabel: resolveWalletLabel(input),
    blockchainTxId: resolveBlockchainTxId(input),
    poolManagerName: extras?.poolManagerName ?? null,
    investorSharePct: extras?.investorSharePct ?? null,
    investmentCycleLabel: extras?.investmentCycleLabel ?? null,
  };
}
