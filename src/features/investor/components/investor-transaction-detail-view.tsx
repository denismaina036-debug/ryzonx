"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ExternalLink } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import type { InvestorTransactionDetail } from "@/domain/transaction/types";
import { TransactionCopyField } from "@/features/investor/components/transactions/transaction-copy-field";
import { TransactionIcon } from "@/features/investor/components/transactions/transaction-icon";
import { TransactionStatusPill } from "@/features/investor/components/transactions/transaction-status-pill";
import { cn } from "@/lib/utils";
import { formatCryptoAmount } from "@/lib/crypto/usd-conversion";

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
  const isDeposit = transaction.category === "deposit";
  const counterpartyLabel = isDeposit ? "Sender" : "Recipient";
  const counterparty = fieldValue(transaction, counterpartyLabel) ?? "External wallet";
  const date = fieldValue(transaction, "Date") ?? new Date(transaction.createdAt).toLocaleString();
  const status = detailStatusLabel(fieldValue(transaction, "Status") ?? transaction.statusLabel);
  const networkFee = fieldValue(transaction, "Network Fee");
  const excluded = new Set(["Date", "Status", counterpartyLabel, "Network Fee"]);
  const remainingFields = transaction.detailFields.filter((field) => !excluded.has(field.label));
  const secondaryAmount =
    transaction.cryptoAmount != null && transaction.cryptoAmount > 0 && transaction.cryptoSymbol
      ? `${transaction.amountPrefix}${formatCryptoAmount(
          transaction.cryptoAmount,
          transaction.cryptoSymbol
        )} ${transaction.cryptoSymbol}`
      : null;

  return (
    <div className="overflow-hidden rounded-[28px] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow-lg)]">
      <div className="relative px-5 pb-8 pt-6 text-center sm:px-8 sm:pb-10">
        <span className="absolute left-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--id-surface-muted)] text-[var(--id-text)] sm:left-7 sm:top-6">
          <ArrowUpRight className={cn("h-5 w-5", isDeposit && "rotate-180")} />
        </span>
        <p className="text-lg font-semibold tracking-tight text-[var(--id-text)]">
          {isDeposit ? "Received" : "Sent"}
        </p>
        <div className="mt-16 sm:mt-14">
          <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-[var(--id-text)] sm:text-4xl">
            {transaction.displayAmount}
          </p>
          {secondaryAmount && (
            <p className="mt-2 font-mono text-lg tabular-nums text-[var(--id-text-muted)] sm:text-xl">
              {secondaryAmount}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4 px-4 pb-5 sm:px-6 sm:pb-7">
        <div className="rounded-2xl bg-[var(--id-surface-muted)] px-4 py-2 sm:px-5">
          <TransferInfoRow label="Date" value={date} />
          <TransferInfoRow label="Status" value={status} accent={status === "Completed"} />
          <TransferInfoRow
            label={counterpartyLabel}
            value={maskWalletAddress(counterparty)}
            mono={counterparty !== "External wallet" && counterparty !== "M-Pesa"}
          />
        </div>

        {networkFee && (
          <div className="rounded-2xl bg-[var(--id-surface-muted)] px-4 py-2 sm:px-5">
            <TransferInfoRow label="Network fee" value={networkFee} />
          </div>
        )}

        {remainingFields.length > 0 && (
          <div className="divide-y divide-[var(--id-border)] rounded-2xl border border-[var(--id-border)] px-4 py-1 sm:px-5">
            {remainingFields.map((field) => {
              const displayValue = PRIVATE_ADDRESS_LABELS.has(field.label)
                ? maskWalletAddress(field.value)
                : field.label === "Status"
                  ? detailStatusLabel(field.value)
                  : field.value;
              return (
                <div key={field.label} className="py-3.5">
                  {field.copyable ? (
                    <TransactionCopyField
                      label={field.label}
                      value={displayValue}
                      copyValue={field.value}
                      mono={field.mono}
                    />
                  ) : (
                    <TransferInfoRow label={field.label} value={displayValue} mono={field.mono} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {transaction.blockchainExplorerUrl && (
          <a
            href={transaction.blockchainExplorerUrl}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--id-border-strong)] text-sm font-semibold text-[var(--id-accent-text)] transition-colors hover:bg-[var(--id-accent-soft)]"
          >
            View on block explorer
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}

export function InvestorTransactionDetailView({
  transaction,
}: {
  transaction: InvestorTransactionDetail;
}) {
  const amountTone = transaction.isCredit
    ? "text-[var(--id-success)]"
    : "text-[var(--id-text)]";

  const transferDetail = isTransferDetail(transaction);

  return (
    <div className="mx-auto w-full min-w-0 max-w-[560px]">
      <Link
        href={ROUTES.transactions}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--id-text-secondary)] transition-colors hover:text-[var(--id-accent-text)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to activity
      </Link>

      {transferDetail ? (
        <WalletTransferDetail transaction={transaction} />
      ) : (
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
      )}
    </div>
  );
}
