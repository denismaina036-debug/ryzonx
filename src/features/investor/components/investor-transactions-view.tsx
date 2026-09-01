"use client";

import Link from "next/link";
import { ArrowLeftRight, ChevronRight } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn, formatCurrency } from "@/lib/utils";
import { formatCryptoAmount } from "@/lib/crypto/usd-conversion";
import { tapRow } from "@/lib/ui/interaction";
import type { InvestorTransaction } from "@/features/investor/types/wallet";
import { TransactionIcon } from "@/features/investor/components/transactions/transaction-icon";
import { TransactionStatusPill } from "@/features/investor/components/transactions/transaction-status-pill";
import { RyvonxEmptyState, RyvonxPageHeader } from "@/features/investor/constants/ui";

interface InvestorTransactionsViewProps {
  transactions: InvestorTransaction[];
}

function transactionDateKey(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function transactionDateLabel(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const today = transactionDateKey(now.toISOString());
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterday = transactionDateKey(yesterdayDate.toISOString());
  const key = transactionDateKey(value);

  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function groupTransactions(transactions: InvestorTransaction[]) {
  const groups = new Map<string, InvestorTransaction[]>();
  for (const transaction of transactions) {
    const key = transactionDateKey(transaction.createdAt);
    const existing = groups.get(key) ?? [];
    existing.push(transaction);
    groups.set(key, existing);
  }
  return [...groups.values()];
}

export function InvestorTransactionsView({
  transactions,
}: InvestorTransactionsViewProps) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-[760px]">
      <RyvonxPageHeader
        title="Transaction History"
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
        <div className="space-y-8">
          {groupTransactions(transactions).map((group) => (
            <section key={transactionDateKey(group[0]?.createdAt ?? "")}>
              <h2 className="mb-3 px-1 text-base font-semibold tracking-tight text-[var(--id-text)]">
                {transactionDateLabel(group[0]?.createdAt ?? "")}
              </h2>
              <ul className="space-y-1">
                {group.map((tx) => {
                  const hasCryptoAmount =
                    tx.cryptoAmount != null &&
                    tx.cryptoAmount > 0 &&
                    Boolean(tx.cryptoSymbol);
                  const settled = ["approved", "completed"].includes(
                    tx.statusLabel.toLowerCase()
                  );

                  return (
                    <li key={tx.id}>
                      <Link
                        href={ROUTES.transactionDetail(tx.id)}
                        className={cn(
                          tapRow,
                          "group flex items-center gap-3 rounded-2xl px-2 py-3 transition-colors hover:bg-[var(--id-surface-hover)] sm:gap-4 sm:px-3"
                        )}
                      >
                        <TransactionIcon
                          kind={tx.iconKind}
                          className="h-11 w-11 rounded-full sm:h-12 sm:w-12"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-semibold text-[var(--id-text)] sm:text-base">
                            {tx.title}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-[var(--id-text-muted)] sm:text-sm">
                            {tx.subtitle}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p
                            className={cn(
                              "font-mono text-sm font-semibold tabular-nums sm:text-base",
                              tx.isCredit
                                ? "text-[var(--id-success)]"
                                : "text-[var(--id-text)]"
                            )}
                          >
                            {hasCryptoAmount
                              ? `${tx.amountPrefix}${formatCryptoAmount(
                                  tx.cryptoAmount ?? 0,
                                  tx.cryptoSymbol ?? ""
                                )} ${tx.cryptoSymbol}`
                              : `${tx.amountPrefix}${formatCurrency(tx.amount)}`}
                          </p>
                          <p className="mt-0.5 text-xs tabular-nums text-[var(--id-text-muted)]">
                            {hasCryptoAmount
                              ? `≈ ${formatCurrency(tx.amount)}`
                              : new Date(tx.createdAt).toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                          </p>
                          {!settled && (
                            <span className="mt-1 inline-flex">
                              <TransactionStatusPill status={tx.statusLabel} />
                            </span>
                          )}
                        </div>
                        <ChevronRight className="hidden h-4 w-4 shrink-0 text-[var(--id-text-faint)] transition-transform group-hover:translate-x-0.5 sm:block" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
