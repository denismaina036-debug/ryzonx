"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn, formatCurrency } from "@/lib/utils";
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
          {items.map((item) => {
            const deposited = item.action === "deposited";
            const Icon = deposited ? ArrowDownLeft : ArrowUpRight;
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 border-b border-[var(--id-border)] py-3 last:border-0"
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    deposited
                      ? "bg-[var(--id-success-soft)] text-[var(--id-success)]"
                      : "bg-orange-500/10 text-orange-400"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--id-text)]">
                    {item.investorName}
                  </p>
                  <p className="text-[11px] text-[var(--id-text-muted)]">
                    {deposited ? "Deposited" : "Withdrew"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm font-semibold tabular-nums text-[var(--id-text)]">
                    {formatCurrency(item.amount)}
                  </p>
                  <p className="text-[11px] text-[var(--id-text-faint)]">
                    {formatActivityTime(item.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
