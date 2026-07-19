"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
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
  critical: "bg-red-500/20 text-red-300",
  high: "bg-amber-500/20 text-amber-300",
  normal: "bg-white/10 text-navy-400",
  low: "bg-white/10 text-navy-500",
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="mt-1 text-sm text-navy-400">
            Operational alerts, funding updates, cycle notifications, and governance actions.
          </p>
        </div>
        {notifications.some((n) => !n.isRead) && (
          <Button size="sm" variant="outline" onClick={() => void markAllRead()}>
            Mark all read
          </Button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-600" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notifications…"
          className="border-white/10 bg-white/5 pl-9 text-white"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-navy-500">No notifications yet.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((n) => {
            const priority = String(n.metadata?.priority ?? "normal");
            return (
              <li
                key={n.id}
                className={cn(
                  "rounded-xl border border-white/[0.06] bg-white/[0.02] p-4",
                  !n.isRead && "border-amber-400/30 bg-amber-400/5"
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy-400">
                    {TYPE_LABELS[n.type] ?? n.type}
                  </span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", PRIORITY_STYLES[priority])}>
                    {priority}
                  </span>
                </div>
                <p className="mt-2 font-medium text-white">{n.title}</p>
                <p className="mt-1 text-sm text-navy-400">{n.message}</p>
                <p className="mt-2 text-xs text-navy-600">{new Date(n.createdAt).toLocaleString()}</p>
              </li>
            );
          })}
        </ul>
      )}

      <Link href={ROUTES.poolManager} className="text-sm text-amber-300/80">
        ← Overview
      </Link>
    </div>
  );
}
