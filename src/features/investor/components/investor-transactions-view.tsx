"use client";

import Link from "next/link";
import { ArrowLeftRight, ChevronRight } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn, formatCurrency } from "@/lib/utils";
import { tapRow } from "@/lib/ui/interaction";
import { ryvonxListContainerClass, ryvonxListDividerClass } from "@/lib/ui/ryvonx-tokens";
import type { InvestorTransaction } from "@/features/investor/types/wallet";
import { TransactionIcon } from "@/features/investor/components/transactions/transaction-icon";
import { TransactionStatusPill } from "@/features/investor/components/transactions/transaction-status-pill";
import { RyvonxEmptyState, RyvonxPageHeader } from "@/features/investor/constants/ui";

interface InvestorTransactionsViewProps {
  transactions: InvestorTransaction[];
}

export function InvestorTransactionsView({
  transactions,
}: InvestorTransactionsViewProps) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-[960px]">
      <RyvonxPageHeader
        title="Personal Activity"
        description={
          <>
            Deposits, withdrawals, pool allocations, and balance movements — with pool context.{" "}
            <Link
              href={ROUTES.platformActivity}
              className="font-medium text-[var(--id-accent-text)] hover:underline"
            >
              View platform activity
            </Link>
          </>
        }
      />

      {transactions.length === 0 ? (
        <RyvonxEmptyState
          icon={<ArrowLeftRight className="h-5 w-5" />}
          title="No transactions yet"
          description="Your deposits, withdrawals, and pool activity will appear here."
          action={
            <Link
              href={ROUTES.deposits}
              className="inline-flex items-center text-sm font-semibold text-[var(--id-accent-text)] hover:underline"
            >
              Make your first deposit
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          }
        />
      ) : (
        <div className={cn(ryvonxListContainerClass, "shadow-[var(--id-shadow-lg)]")}>
          <ul className={ryvonxListDividerClass}>
            {transactions.map((tx) => (
              <li key={tx.id}>
                <Link
                  href={ROUTES.transactionDetail(tx.id)}
                  className={cn(
                    tapRow,
                    "flex flex-col gap-4 px-5 py-4 hover:bg-[var(--id-surface-hover)] sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <TransactionIcon kind={tx.iconKind} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--id-text)]">{tx.title}</p>
                      <p className="mt-0.5 text-xs text-[var(--id-text-muted)]">{tx.subtitle}</p>
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
                        tx.isCredit ? "text-[var(--id-success)]" : "text-[var(--id-text)]"
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
