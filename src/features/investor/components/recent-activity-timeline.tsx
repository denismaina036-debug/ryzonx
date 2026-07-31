"use client";

import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { cn, formatCurrency } from "@/lib/utils";
import { tapRow } from "@/lib/ui/interaction";
import {
  DashboardCard,
  dashboardCardBodyClass,
} from "@/features/investor/components/dashboard-card";
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

interface RecentActivityTimelineProps {
  activity: InvestorPoolActivityItem[];
  maxItems?: number;
  compact?: boolean;
}

export function RecentActivityTimeline({
  activity,
  maxItems = 6,
}: RecentActivityTimelineProps) {
  const items = activity.slice(0, maxItems);

  return (
    <DashboardCard
      title="Recent Activity"
      headerAction={
        <Link
          href={ROUTES.transactions}
          className="text-xs font-medium text-[var(--id-accent-text)] hover:underline"
        >
          View all
        </Link>
      }
    >
      <div className={cn(dashboardCardBodyClass, "pt-1")}>
        {items.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--id-text-muted)]">
            No recent activity.
          </p>
        ) : (
          <ul className="space-y-0">
            {items.map((item) => (
              <li key={item.id} className="border-b border-[var(--id-border)] last:border-0">
                <Link
                  href={ROUTES.transactionDetail(item.id)}
                  className={cn(
                    tapRow,
                    "flex items-start gap-3 py-3.5 transition-colors hover:bg-[var(--id-surface-hover)]"
                  )}
                >
                  <TransactionIcon kind={item.iconKind} size="sm" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-[var(--id-text)]">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--id-text-muted)]">
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
                        <p className="mt-0.5 text-[11px] text-[var(--id-text-faint)]">
                          {formatActivityTime(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardCard>
  );
}

export { RecentActivityTimeline as PoolActivityFeed };
