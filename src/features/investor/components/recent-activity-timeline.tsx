"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn, formatCurrency } from "@/lib/utils";
import {
  DashboardCard,
  dashboardCardBodyClass,
} from "@/features/investor/components/dashboard-card";
import type { InvestorPoolActivityItem } from "@/features/investor/types";

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

function getActivityVisual(action: InvestorPoolActivityItem["action"]) {
  if (action === "deposited") {
    return {
      icon: ArrowDownLeft,
      className: "bg-[var(--id-success-soft)] text-[var(--id-success)]",
      label: "Deposited",
    };
  }
  return {
    icon: ArrowUpRight,
    className: "bg-orange-500/10 text-orange-400",
    label: "Withdrew",
  };
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
            {items.map((item) => {
              const visual = getActivityVisual(item.action);
              const Icon = visual.icon;

              return (
                <li
                  key={item.id}
                  className="flex items-start gap-3 border-b border-[var(--id-border)] py-3.5 last:border-0"
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      visual.className
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-[var(--id-text)]">
                          {item.investorName}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--id-text-muted)]">
                          {visual.label}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-semibold tabular-nums text-[var(--id-text)]">
                          {formatCurrency(item.amount)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[var(--id-text-faint)]">
                          {formatActivityTime(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DashboardCard>
  );
}

export { RecentActivityTimeline as PoolActivityFeed };
