"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import type { InvestorTransactionDetail } from "@/domain/transaction/types";
import { TransactionCopyField } from "@/features/investor/components/transactions/transaction-copy-field";
import { TransactionIcon } from "@/features/investor/components/transactions/transaction-icon";
import { TransactionStatusPill } from "@/features/investor/components/transactions/transaction-status-pill";
import { TransactionTimeline } from "@/features/investor/components/transactions/transaction-timeline";
import { cn } from "@/lib/utils";

export function InvestorTransactionDetailView({
  transaction,
}: {
  transaction: InvestorTransactionDetail;
}) {
  const amountTone = transaction.isCredit
    ? "text-[var(--id-success)]"
    : "text-[var(--id-text)]";

  return (
    <div className="mx-auto w-full min-w-0 max-w-[960px]">
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
              <TransactionStatusPill status={transaction.statusLabel} />
            </div>
            <p className="mt-3 text-sm text-[var(--id-text-muted)]">{transaction.subtitle}</p>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1fr_280px]">
          <div className="border-b border-[var(--id-border)] px-5 py-6 sm:px-8 lg:border-b-0 lg:border-r">
            <h2 className="text-sm font-semibold text-[var(--id-text)]">
              Transaction Information
            </h2>
            <dl className="mt-5 divide-y divide-[var(--id-border)]">
              {transaction.detailFields.map((field) => (
                <div key={field.label} className="py-3.5 first:pt-0 last:pb-0">
                  {field.copyable ? (
                    <TransactionCopyField label={field.label} value={field.value} mono={field.mono} />
                  ) : (
                    <>
                      <dt className="text-xs font-medium text-[var(--id-text-muted)]">
                        {field.label}
                      </dt>
                      <dd
                        className={cn(
                          "mt-1 text-sm text-[var(--id-text)]",
                          field.mono && "font-mono break-all"
                        )}
                      >
                        {field.value}
                      </dd>
                    </>
                  )}
                </div>
              ))}
            </dl>
          </div>

          <aside className="px-5 py-6 sm:px-8">
            <h2 className="text-sm font-semibold text-[var(--id-text)]">Progress</h2>
            <div className="mt-5">
              <TransactionTimeline steps={transaction.timeline} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
