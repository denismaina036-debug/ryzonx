"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Share2, X } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import type { InvestorTransactionDetail } from "@/domain/transaction/types";
import { TransactionCopyField } from "@/features/investor/components/transactions/transaction-copy-field";
import { TransactionIcon } from "@/features/investor/components/transactions/transaction-icon";
import { TransactionStatusPill } from "@/features/investor/components/transactions/transaction-status-pill";
import { cn, formatCurrency } from "@/lib/utils";
import { formatTransferAssetAmount } from "@/lib/crypto/usd-conversion";

function maskWalletAddress(address: string): string {
  const trimmed = address.trim();
  if (trimmed.length <= 8) return trimmed;
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

function detailStatusLabel(status: string): string {
  return status.toLowerCase() === "approved" ? "Completed" : status;
}

const PRIVATE_ADDRESS_LABELS = new Set([
  "Wallet Address",
  "Recipient",
  "Sender",
  "Deposit Address",
]);

function isTransferDetail(transaction: InvestorTransactionDetail): boolean {
  return transaction.category === "deposit" || transaction.category === "withdrawal";
}

function fieldValue(
  transaction: InvestorTransactionDetail,
  label: string
): string | null {
  return transaction.detailFields.find((field) => field.label === label)?.value ?? null;
}

function TransferInfoRow({
  label,
  value,
  accent = false,
  mono = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] items-start gap-3 py-2.5 sm:grid-cols-[120px_minmax(0,1fr)]">
      <span className="text-sm text-[var(--id-text-muted)]">{label}</span>
      <span
        className={cn(
          "min-w-0 text-right text-sm font-semibold text-[var(--id-text)]",
          mono && "break-all font-mono",
          accent && "text-[var(--id-success)]"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function WalletTransferDetail({
  transaction,
}: {
  transaction: InvestorTransactionDetail;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const isDeposit = transaction.category === "deposit";
  const counterpartyLabel = isDeposit ? "Sender" : "Recipient";
  const counterparty = fieldValue(transaction, counterpartyLabel) ?? "External wallet";
  const date = fieldValue(transaction, "Date") ?? new Date(transaction.createdAt).toLocaleString();
  const status = detailStatusLabel(fieldValue(transaction, "Status") ?? transaction.statusLabel);
  const networkFee = fieldValue(transaction, "Network Fee");
  const assetSymbol = transaction.cryptoSymbol || transaction.amountSuffix || "USDT";
  const assetAmount =
    transaction.cryptoAmount != null && transaction.cryptoAmount > 0
      ? transaction.cryptoAmount
      : transaction.amount;
  const secondaryAmount = `${transaction.amountPrefix}${formatTransferAssetAmount(
    assetAmount
  )} ${assetSymbol}`;

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/20 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-detail-title"
    >
      <div className="flex min-h-[66dvh] max-h-[94dvh] w-full max-w-[560px] flex-col overflow-y-auto rounded-t-[32px] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-2xl sm:min-h-0 sm:max-h-[calc(100dvh-3rem)] sm:rounded-[32px]">
        <div className="relative px-5 pb-8 pt-7 text-center sm:px-8 sm:pb-10">
          <span className="absolute left-5 top-5 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--id-surface-muted)] text-[var(--id-text)] sm:left-7 sm:top-6">
            <Share2 className="h-5 w-5" />
          </span>
          <Link
            href={ROUTES.transactions}
            aria-label="Close transaction details"
            className="absolute right-5 top-5 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--id-surface-muted)] text-[var(--id-text)] transition-colors hover:bg-[var(--id-surface-hover)] sm:right-7 sm:top-6"
          >
            <X className="h-6 w-6" />
          </Link>
          <p
            id="transaction-detail-title"
            className="text-xl font-semibold tracking-tight text-[var(--id-text)]"
          >
            {isDeposit ? "Received" : "Sent"}
          </p>
          <div className="mt-20 sm:mt-16">
            <p className="font-mono text-4xl font-semibold tabular-nums tracking-tight text-[var(--id-text)]">
              ≈ {formatCurrency(transaction.amount)}
            </p>
            <p className="mt-2 font-mono text-xl tabular-nums text-[var(--id-text-muted)]">
              {secondaryAmount}
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-7">
          <div className="rounded-[24px] bg-[var(--id-surface-muted)] px-4 py-2.5 sm:px-5">
            <TransferInfoRow label="Date" value={date} />
            <TransferInfoRow label="Status" value={status} accent={status === "Completed"} />
            <TransferInfoRow
              label={counterpartyLabel}
              value={counterparty}
              mono={counterparty !== "External wallet" && counterparty !== "M-Pesa"}
            />
          </div>

          {networkFee && (
            <div className="rounded-[24px] bg-[var(--id-surface-muted)] px-4 py-2.5 sm:px-5">
              <TransferInfoRow label="Network fee" value={networkFee} mono />
            </div>
          )}

          {transaction.blockchainExplorerUrl && (
            <a
              href={transaction.blockchainExplorerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-auto flex min-h-16 items-center justify-center gap-2 rounded-[22px] border border-dashed border-[var(--id-border-strong)] text-base font-semibold text-[var(--id-accent-text)] transition-colors hover:bg-[var(--id-accent-soft)]"
            >
              View on block explorer
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function InvestorTransactionDetailView({
  transaction,
}: {
  transaction: InvestorTransactionDetail;
}) {
  const transferDetail = isTransferDetail(transaction);
  if (transferDetail) {
    return <WalletTransferDetail transaction={transaction} />;
  }

  const amountTone = transaction.isCredit
    ? "text-[var(--id-success)]"
    : "text-[var(--id-text)]";

  return (
    <div className="mx-auto w-full min-w-0 max-w-[560px]">
      <Link
        href={ROUTES.transactions}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--id-text-secondary)] transition-colors hover:text-[var(--id-accent-text)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to activity
      </Link>

      <div className="overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow-lg)]">
          <div className="border-b border-[var(--id-border)] px-5 py-8 text-center sm:px-8">
            <div className="mx-auto flex max-w-md flex-col items-center">
              <TransactionIcon kind={transaction.iconKind} />
              <p className="mt-4 text-sm font-medium text-[var(--id-text-secondary)]">
                {transaction.title}
              </p>
              <p
                className={cn(
                  "mt-2 font-mono text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl",
                  amountTone
                )}
              >
                {transaction.displayAmount}
              </p>
              <div className="mt-4">
                <TransactionStatusPill status={detailStatusLabel(transaction.statusLabel)} />
              </div>
              <p className="mt-3 text-sm text-[var(--id-text-muted)]">{transaction.subtitle}</p>
            </div>
          </div>

          <dl className="divide-y divide-[var(--id-border)] px-5 py-2 sm:px-8">
            {transaction.detailFields.map((field) => (
              <div key={field.label} className="py-4">
                {field.copyable ? (
                  PRIVATE_ADDRESS_LABELS.has(field.label) ? (
                    <TransactionCopyField
                      label={field.label}
                      value={maskWalletAddress(field.value)}
                      copyValue={field.value}
                      mono={field.mono}
                    />
                  ) : (
                    <TransactionCopyField label={field.label} value={field.value} mono={field.mono} />
                  )
                ) : (
                  <>
                    <dt className="text-xs font-medium text-[var(--id-text-muted)]">
                      {field.label}
                    </dt>
                    <dd
                      className={cn(
                        "mt-1 text-sm font-medium text-[var(--id-text)]",
                        field.mono && "font-mono break-all"
                      )}
                    >
                      {field.label === "Status"
                        ? detailStatusLabel(field.value)
                        : field.value}
                    </dd>
                  </>
                )}
              </div>
            ))}
          </dl>
      </div>
    </div>
  );
}
