"use client";

import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { cn, formatCurrency } from "@/lib/utils";
import type { InvestorPoolActivityItem } from "@/features/investor/types";
import { TransactionIcon } from "@/features/investor/components/transactions/transaction-icon";

function formatActivityTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function MobileRecentActivity({
  activity,
}: {
  activity: InvestorPoolActivityItem[];
}) {
  const items = activity.slice(0, 4);

  return (
    <section className="rounded-2xl bg-[var(--id-surface)] p-4 shadow-[var(--id-shadow)]">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--id-text)]">Recent Activity</h2>
        <Link
          href={ROUTES.transactions}
          className="text-xs font-medium text-[var(--id-accent-text)] hover:underline"
        >
          View all
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-xs text-[var(--id-text-muted)]">
          No recent activity.
        </p>
      ) : (
        <ul className="mt-2">
          {items.map((item) => (
            <li key={item.id} className="border-b border-[var(--id-border)] last:border-0">
              <Link
                href={ROUTES.transactionDetail(item.id)}
                className="flex items-center gap-3 py-3 transition-colors hover:opacity-90"
              >
                <TransactionIcon kind={item.iconKind} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--id-text)]">
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-[var(--id-text-muted)]">
                    {item.subtitle}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "font-mono text-sm font-semibold tabular-nums",
                      item.amountPrefix === "+"
                        ? "text-[var(--id-success)]"
                        : "text-[var(--id-text)]"
                    )}
                  >
                    {item.amountPrefix}
                    {formatCurrency(item.amount)}
                  </p>
                  <p className="text-[10px] text-[var(--id-text-faint)]">
                    {formatActivityTime(item.createdAt)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
