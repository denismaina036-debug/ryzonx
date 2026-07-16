"use client";

import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  ChevronRight,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn, formatCurrency, formatPercentage } from "@/lib/utils";
import type { InvestorTransaction } from "@/features/investor/types/wallet";

interface InvestorTransactionsViewProps {
  transactions: InvestorTransaction[];
}

export function InvestorTransactionsView({
  transactions,
}: InvestorTransactionsViewProps) {
  return (
    <div className="mx-auto max-w-[960px]">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--id-text)] sm:text-[1.85rem]">
          Transactions
        </h1>
        <p className="mt-2 text-sm text-[var(--id-text-secondary)]">
          Deposits, withdrawals, pool allocations, and balance movements — with pool
          context.
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
              <li
                key={tx.id}
                className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-[var(--id-surface-hover)] sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <TransactionIcon type={tx.type} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold capitalize text-[var(--id-text)]">
                      {tx.type}
                      {tx.cryptoSymbol && (
                        <span className="ml-2 font-normal text-[var(--id-text-secondary)]">
                          {tx.cryptoAmount ?? tx.amount} {tx.cryptoSymbol}
                          {tx.cryptoNetwork ? ` · ${tx.cryptoNetwork}` : ""}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-[var(--id-text-muted)]">
                      <span className="font-medium text-[var(--id-text-secondary)]">
                        {tx.fundName}
                      </span>
                      {tx.poolWinRate != null && tx.poolWinRate > 0 && (
                        <span className="ml-2 text-[var(--id-success)]">
                          Win rate {formatPercentage(tx.poolWinRate)}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--id-text-faint)]">
                      {new Date(tx.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {tx.reference ? ` · Ref ${tx.reference}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end sm:text-right">
                  <span className="font-mono text-sm font-semibold tabular-nums text-[var(--id-text)]">
                    {formatCurrency(tx.amount)}
                  </span>
                  <StatusPill status={tx.status} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TransactionIcon({ type }: { type: string }) {
  const normalized = type.toLowerCase();
  const Icon =
    normalized.includes("deposit")
      ? ArrowDownToLine
      : normalized.includes("withdraw")
        ? ArrowUpFromLine
        : ArrowLeftRight;

  const tone =
    normalized.includes("deposit")
      ? "bg-[var(--id-success-soft)] text-[var(--id-success)]"
      : normalized.includes("withdraw")
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        : "bg-[var(--id-accent-soft)] text-[var(--id-accent-text)]";

  return (
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
        tone
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "bg-[var(--id-success-soft)] text-[var(--id-success)]",
    approved: "bg-[var(--id-success-soft)] text-[var(--id-success)]",
    pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    rejected: "bg-red-500/10 text-[var(--id-danger)]",
    cancelled: "bg-[var(--id-surface-muted)] text-[var(--id-text-muted)]",
  };

  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        styles[status] ?? "bg-[var(--id-surface-muted)] text-[var(--id-text-muted)]"
      )}
    >
      {status}
    </span>
  );
}
