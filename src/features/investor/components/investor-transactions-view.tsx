"use client";

import Link from "next/link";
import { ArrowLeftRight, ChevronRight } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn, formatCurrency } from "@/lib/utils";
import type { InvestorTransaction } from "@/features/investor/types/wallet";
import { TransactionIcon } from "@/features/investor/components/transactions/transaction-icon";
import { TransactionStatusPill } from "@/features/investor/components/transactions/transaction-status-pill";

interface InvestorTransactionsViewProps {
  transactions: InvestorTransaction[];
}

export function InvestorTransactionsView({
  transactions,
}: InvestorTransactionsViewProps) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-[960px]">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--id-text)] sm:text-[1.85rem]">
          Personal Activity
        </h1>
        <p className="mt-2 text-sm text-[var(--id-text-secondary)]">
          Deposits, withdrawals, pool allocations, and balance movements — with pool
          context.{" "}
          <Link
            href={ROUTES.platformActivity}
            className="font-medium text-[var(--id-accent-text)] hover:underline"
          >
            View platform activity
          </Link>
        </p>
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] p-10 text-center shadow-[var(--id-shadow)]">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--id-surface-muted)]">
            <ArrowLeftRight className="h-5 w-5 text-[var(--id-text-muted)]" />
          </span>
          <p className="mt-4 text-sm font-medium text-[var(--id-text)]">No transactions yet</p>
          <p className="mt-1 text-sm text-[var(--id-text-muted)]">
            Your deposits, withdrawals, and pool activity will appear here.
          </p>
          <Link
            href={ROUTES.deposits}
            className="mt-5 inline-flex items-center text-sm font-semibold text-[var(--id-accent-text)] hover:underline"
          >
            Make your first deposit
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[var(--id-radius)] border border-[var(--id-border)] bg-[var(--id-surface)] shadow-[var(--id-shadow-lg)]">
          <ul className="divide-y divide-[var(--id-border)]">
            {transactions.map((tx) => (
              <li key={tx.id}>
                <Link
                  href={ROUTES.transactionDetail(tx.id)}
                  className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-[var(--id-surface-hover)] sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <TransactionIcon kind={tx.iconKind} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--id-text)]">
                        {tx.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--id-text-muted)]">
                        {tx.subtitle}
                      </p>
                      <p className="mt-1 text-xs text-[var(--id-text-faint)]">
                        {new Date(tx.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {tx.transactionReference
                          ? ` · ${tx.transactionReference}`
                          : tx.reference
                            ? ` · ${tx.reference}`
                            : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end sm:text-right">
                    <span
                      className={cn(
                        "font-mono text-sm font-semibold tabular-nums",
                        tx.isCredit
                          ? "text-[var(--id-success)]"
                          : "text-[var(--id-text)]"
                      )}
                    >
                      {tx.amountPrefix}
                      {formatCurrency(tx.amount)}
                    </span>
                    <TransactionStatusPill status={tx.statusLabel} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
