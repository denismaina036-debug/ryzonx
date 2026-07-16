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
  investorCardClass,
  investorEmptyStateClass,
  investorPageSubtitleClass,
  investorPageTitleClass,
} from "@/features/investor/constants/ui";
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
};

const PRIORITY_STYLES: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-amber-100 text-amber-800",
  normal: "bg-[var(--id-surface-muted)] text-[var(--id-text-muted)]",
  low: "bg-[var(--id-surface-muted)] text-[var(--id-text-muted)]",
};

export function InvestorNotificationsView({
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
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className={investorPageTitleClass}>Notifications</h1>
          <p className={investorPageSubtitleClass}>
            Your communication timeline — deposits, investments, support, and system updates.
          </p>
        </div>
        {notifications.some((n) => !n.isRead) && (
          <Button
            size="sm"
            variant="outline"
            className="border-[var(--id-border)] text-[var(--id-text-secondary)]"
            onClick={markAllRead}
          >
            Mark all read
          </Button>
        )}
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--id-text-faint)]" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notifications…"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className={`${investorEmptyStateClass} py-10`}>
          <p className="text-sm text-[var(--id-text-muted)]">
            {query ? "No notifications match your search." : "No notifications yet."}
          </p>
        </div>
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
                  `${investorCardClass} p-4 transition-colors`,
                  !n.isRead && "border-[var(--id-accent)]/30 bg-[var(--id-accent-soft)]"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[var(--id-surface-muted)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--id-text-muted)]">
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
                          className="h-2 w-2 rounded-full bg-[var(--id-accent)]"
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
                      className="shrink-0 text-[var(--id-accent-text)]"
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
