"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  pmCardClass,
  pmInputClass,
  pmSecondaryButtonClass,
  RyvonxEmptyState,
} from "@/features/pool-manager/constants/ui";
import { PmPageHeader } from "@/features/pool-manager/components/workspace/pm-page-header";
import type { InvestorNotification } from "@/features/investor/types/account";

const TYPE_LABELS: Record<string, string> = {
  deposit_approved: "Deposit",
  deposit_rejected: "Deposit",
  withdrawal_approved: "Withdrawal",
  withdrawal_rejected: "Withdrawal",
  pool_invitation: "Pool Invite",
  pool_trading: "Pool Trading",
  support_reply: "Support",
  admin_message: "Admin",
  announcement: "Announcement",
  performance_update: "Performance",
  system: "System",
  pool_governance_warning: "Governance",
  pool_governance_review: "Governance",
  pm_application_submitted: "Pool Manager",
  pm_application_approved: "Pool Manager",
  investment_updated: "Investment",
  pool_profit_share: "Distribution",
  strategy_approved: "Strategy",
  governance_warning: "Governance",
  investment_closed: "Cycle",
};

const PRIORITY_STYLES: Record<string, string> = {
  critical: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  high: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  normal: "bg-[var(--id-surface-muted)] text-[var(--id-text-muted)]",
  low: "bg-[var(--id-surface-muted)] text-[var(--id-text-muted)]",
};

export function PoolManagerNotificationsView({
  notifications,
}: {
  notifications: InvestorNotification[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notifications;
    return notifications.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        (TYPE_LABELS[n.type] ?? n.type).toLowerCase().includes(q)
    );
  }, [notifications, query]);

  async function markAllRead() {
    const res = await fetch("/api/investor/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    if (!res.ok) {
      toast.error("Could not mark notifications as read");
      return;
    }
    router.refresh();
  }

  async function markRead(id: string) {
    await fetch("/api/investor/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[760px]">
      <PmPageHeader
        title="Notifications"
        description="Operational alerts, funding updates, cycle notifications, and governance actions."
        actions={
          notifications.some((n) => !n.isRead) ? (
            <Button size="sm" variant="outline" className={pmSecondaryButtonClass} onClick={markAllRead}>
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--id-text-faint)]" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notifications…"
          className={cn("pl-9", pmInputClass)}
        />
      </div>

      {filtered.length === 0 ? (
        <RyvonxEmptyState
          icon={<Search className="h-5 w-5" />}
          title={query ? "No matching notifications" : "No notifications yet"}
          description={
            query
              ? "Try a different search term or clear the filter."
              : "Funding updates, cycle events, and governance alerts will appear here."
          }
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((n) => {
            const priority = String(n.metadata?.priority ?? "normal");
            const actionUrl = n.metadata?.action_url as string | undefined;
            const actionLabel = (n.metadata?.action_label as string | undefined) ?? "View";

            return (
              <li
                key={n.id}
                className={cn(
                  `${pmCardClass} p-4 transition-colors`,
                  !n.isRead && "border-[var(--pm-accent-ring)] bg-[var(--pm-accent-soft)]"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[var(--id-surface)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
                        {TYPE_LABELS[n.type] ?? n.type}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.normal
                        )}
                      >
                        {priority}
                      </span>
                      {!n.isRead && (
                        <span
                          className="h-2 w-2 rounded-full bg-[var(--pm-accent)]"
                          aria-hidden
                        />
                      )}
                    </div>
                    <p className="mt-2 text-sm font-medium text-[var(--id-text)]">{n.title}</p>
                    <p className="mt-1 text-sm text-[var(--id-text-secondary)]">{n.message}</p>
                    <p className="mt-2 text-xs text-[var(--id-text-faint)]">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                    {actionUrl && (
                      <Button size="sm" variant="outline" className="mt-3" asChild>
                        <Link href={actionUrl}>{actionLabel}</Link>
                      </Button>
                    )}
                  </div>
                  {!n.isRead && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-[var(--pm-accent-text)]"
                      onClick={() => markRead(n.id)}
                    >
                      Read
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
