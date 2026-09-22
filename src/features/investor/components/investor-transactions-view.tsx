"use client";

import Link from "next/link";
import { ArrowLeftRight, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { copyTradingText } from "@/lib/copy-trading-presentation";
import { cn, formatCurrency } from "@/lib/utils";
import { formatTransferAssetAmount } from "@/lib/crypto/usd-conversion";
import { tapRow } from "@/lib/ui/interaction";
import type { InvestorDashboardTrade } from "@/features/investor/types";
import type { InvestorTransaction } from "@/features/investor/types/wallet";
import { TransactionIcon } from "@/features/investor/components/transactions/transaction-icon";
import { TransactionStatusPill } from "@/features/investor/components/transactions/transaction-status-pill";
import { RyvonxEmptyState, RyvonxPageHeader } from "@/features/investor/constants/ui";

interface InvestorTransactionsViewProps {
  transactions: InvestorTransaction[];
  trades: InvestorDashboardTrade[];
}

type ActivityRecord =
  | { kind: "transaction"; id: string; createdAt: string; transaction: InvestorTransaction }
  | { kind: "trade"; id: string; createdAt: string; trade: InvestorDashboardTrade };

function activityDateKey(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function activityDateLabel(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const today = activityDateKey(now.toISOString());
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterday = activityDateKey(yesterdayDate.toISOString());
  const key = activityDateKey(value);

  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function groupActivity(records: ActivityRecord[]) {
  const groups = new Map<string, ActivityRecord[]>();
  for (const record of records) {
    const key = activityDateKey(record.createdAt);
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  return [...groups.values()];
}

function formatPrice(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 });
}

export function InvestorTransactionsView({ transactions, trades }: InvestorTransactionsViewProps) {
  const activity: ActivityRecord[] = [
    ...transactions.map((transaction) => ({
      kind: "transaction" as const,
      id: `transaction-${transaction.id}`,
      createdAt: transaction.createdAt,
      transaction,
    })),
    ...trades.map((trade) => ({
      kind: "trade" as const,
      id: `trade-${trade.id}`,
      createdAt: trade.closedAt ?? trade.openedAt,
      trade,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="mx-auto w-full min-w-0 max-w-[760px]">
      <RyvonxPageHeader
        title="Transaction History"
        description={
          <>
            Deposits, withdrawals, copied trades, allocations, and balance movements.{" "}
            <Link href={ROUTES.platformActivity} className="font-medium text-[var(--id-accent-text)] hover:underline">
              View platform activity
            </Link>
          </>
        }
      />

      {activity.length === 0 ? (
        <RyvonxEmptyState
          icon={<ArrowLeftRight className="h-5 w-5" />}
          title="No activity yet"
          description="Your deposits, withdrawals, copied trades, and strategy activity will appear here."
          action={
            <Link href={ROUTES.deposits} className="inline-flex items-center text-sm font-semibold text-[var(--id-accent-text)] hover:underline">
              Make your first deposit
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          {groupActivity(activity).map((group) => (
            <section key={activityDateKey(group[0]?.createdAt ?? "")}>
              <h2 className="mb-3 px-1 text-base font-semibold tracking-tight text-[var(--id-text)]">
                {activityDateLabel(group[0]?.createdAt ?? "")}
              </h2>
              <ul className="space-y-1">
                {group.map((record) =>
                  record.kind === "trade" ? (
                    <TradeActivityRow key={record.id} trade={record.trade} />
                  ) : (
                    <TransactionActivityRow key={record.id} transaction={record.transaction} />
                  )
                )}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function TradeActivityRow({ trade }: { trade: InvestorDashboardTrade }) {
  const isProfit = trade.profitLoss >= 0;
  const occurredAt = trade.closedAt ?? trade.openedAt;

  return (
    <li>
      <article className="flex items-center gap-3 rounded-2xl px-2 py-3 sm:gap-4 sm:px-3">
        <span className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12",
          isProfit ? "bg-[var(--id-success-soft)] text-[var(--id-success)]" : "bg-red-500/10 text-[var(--id-danger)]"
        )}>
          {isProfit ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-semibold text-[var(--id-text)] sm:text-base">{trade.asset}</p>
            <span className="text-xs font-semibold uppercase text-[var(--id-text-muted)]">{trade.direction}</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-[var(--id-text-muted)] sm:text-sm">
            Entry {formatPrice(trade.entryPrice)} → Exit {formatPrice(trade.currentPrice)}
          </p>
          <p className="mt-0.5 truncate text-xs text-[var(--id-text-muted)]">
            Trader: {trade.poolManagerName ?? "Verified trader"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn(
            "font-mono text-sm font-semibold tabular-nums sm:text-base",
            isProfit ? "text-[var(--id-success)]" : "text-[var(--id-danger)]"
          )}>
            {isProfit ? "Profit +" : "Loss -"}{formatCurrency(Math.abs(trade.profitLoss))}
          </p>
          <p className="mt-0.5 text-xs tabular-nums text-[var(--id-text-muted)]">
            {new Date(occurredAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
      </article>
    </li>
  );
}

function TransactionActivityRow({ transaction: tx }: { transaction: InvestorTransaction }) {
  const isWalletTransfer = tx.category === "deposit" || tx.category === "withdrawal";
  const assetSymbol = tx.cryptoSymbol || (isWalletTransfer ? tx.amountSuffix : "");
  const assetAmount = tx.cryptoAmount != null && tx.cryptoAmount > 0 ? tx.cryptoAmount : tx.amount;
  const showAssetAmount = Boolean(assetSymbol) && isWalletTransfer;
  const settled = ["approved", "completed"].includes(tx.statusLabel.toLowerCase());

  return (
    <li>
      <Link href={ROUTES.transactionDetail(tx.id)} className={cn(
        tapRow,
        "group flex items-center gap-3 rounded-2xl px-2 py-3 transition-colors hover:bg-[var(--id-surface-hover)] sm:gap-4 sm:px-3"
      )}>
        <TransactionIcon kind={tx.iconKind} className="h-11 w-11 rounded-full sm:h-12 sm:w-12" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-[var(--id-text)] sm:text-base">{copyTradingText(tx.title)}</p>
          <p className="mt-0.5 truncate text-xs text-[var(--id-text-muted)] sm:text-sm">{copyTradingText(tx.subtitle)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn(
            "font-mono text-sm font-semibold tabular-nums sm:text-base",
            tx.isCredit ? "text-[var(--id-success)]" : "text-[var(--id-text)]"
          )}>
            {showAssetAmount
              ? `${tx.amountPrefix}${formatTransferAssetAmount(assetAmount)} ${assetSymbol}`
              : `${tx.amountPrefix}${formatCurrency(tx.amount)}`}
          </p>
          <p className="mt-0.5 text-xs tabular-nums text-[var(--id-text-muted)]">
            {showAssetAmount
              ? `≈ ${formatCurrency(tx.amount)}`
              : new Date(tx.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </p>
          {!settled && <span className="mt-1 inline-flex"><TransactionStatusPill status={tx.statusLabel} /></span>}
        </div>
        <ChevronRight className="hidden h-4 w-4 shrink-0 text-[var(--id-text-faint)] transition-transform group-hover:translate-x-0.5 sm:block" />
      </Link>
    </li>
  );
}
