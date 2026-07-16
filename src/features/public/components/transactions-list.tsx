import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityFeed } from "@/components/ui/activity-feed";
import { cn, formatCurrency } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import type { ActivityItem } from "@/types";

interface TransactionsListProps {
  items: ActivityItem[];
  className?: string;
}

function TransactionRow({ item }: { item: ActivityItem }) {
  if (item.type !== "deposit" && item.type !== "withdrawal") return null;

  const isDeposit = item.type === "deposit";
  const Icon = isDeposit ? ArrowDownToLine : ArrowUpFromLine;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:bg-surface-1">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          isDeposit ? "bg-emerald-50 text-emerald-600" : "bg-gold-50 text-gold-600"
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-navy-950">
          {item.displayName}{" "}
          <span className="font-normal text-navy-500">
            {isDeposit ? "deposited" : "withdrew"}
          </span>
        </p>
        <p className="text-xs text-navy-500">
          {new Date(item.createdAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>
      <p className="shrink-0 font-mono text-sm font-semibold text-navy-950">
        {formatCurrency(item.amount)}
      </p>
    </div>
  );
}

export function TransactionsList({ items, className }: TransactionsListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface-1 px-6 py-12 text-center">
        <p className="text-sm text-navy-500">
          No public transactions yet. Investors can choose whether their activity
          appears here.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => (
        <TransactionRow key={item.id} item={item} />
      ))}
    </div>
  );
}

interface ActivityFilterTabsProps {
  current: "all" | "deposit" | "withdrawal";
}

export function ActivityFilterTabs({ current }: ActivityFilterTabsProps) {
  const tabs = [
    { label: "All", value: "all" },
    { label: "Deposits", value: "deposit" },
    { label: "Withdrawals", value: "withdrawal" },
  ] as const;

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Button
          key={tab.value}
          asChild
          size="sm"
          variant={current === tab.value ? "default" : "outline"}
        >
          <Link href={tab.value === "all" ? ROUTES.activity : `${ROUTES.activity}?type=${tab.value}`}>
            {tab.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}

export function ActivityDepositsWithdrawals({
  deposits,
  withdrawals,
}: {
  deposits: ActivityItem[];
  withdrawals: ActivityItem[];
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <h3 className="mb-4 text-lg font-semibold text-navy-950">
          Recent Deposits
        </h3>
        <ActivityFeed items={deposits} type="deposit" />
      </div>
      <div>
        <h3 className="mb-4 text-lg font-semibold text-navy-950">
          Recent Withdrawals
        </h3>
        <ActivityFeed items={withdrawals} type="withdrawal" />
      </div>
    </div>
  );
}
