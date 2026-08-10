"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import type { InvestorTransactionDetail } from "@/domain/transaction/types";
import { TransactionCopyField } from "@/features/investor/components/transactions/transaction-copy-field";
import { TransactionIcon } from "@/features/investor/components/transactions/transaction-icon";
import { TransactionStatusPill } from "@/features/investor/components/transactions/transaction-status-pill";
import { cn } from "@/lib/utils";

function maskWalletAddress(address: string): string {
  const trimmed = address.trim();
  if (trimmed.length <= 8) return trimmed;
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

function detailStatusLabel(status: string): string {
  return status.toLowerCase() === "approved" ? "Completed" : status;
}

export function InvestorTransactionDetailView({
  transaction,
}: {
  transaction: InvestorTransactionDetail;
}) {
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
                field.label === "Wallet Address" ? (
                  <TransactionCopyField
                    label={field.label}
                    value={maskWalletAddress(field.value)}
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
