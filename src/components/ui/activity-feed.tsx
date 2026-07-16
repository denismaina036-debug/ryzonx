import { ArrowDownToLine, ArrowUpFromLine, UserPlus } from "lucide-react";
import { cn, formatCurrency, formatRelativeTime } from "@/lib/utils";
import type { ActivityItem } from "@/types";

interface ActivityFeedProps {
  items: ActivityItem[];
  type: "deposit" | "withdrawal" | "investor";
  className?: string;
  emptyMessage?: string;
}

const icons = {
  deposit: ArrowDownToLine,
  withdrawal: ArrowUpFromLine,
  investor: UserPlus,
};

const iconColors = {
  deposit: "bg-emerald-50 text-emerald-600",
  withdrawal: "bg-gold-50 text-gold-600",
  investor: "bg-royal-50 text-royal-600",
};

export function ActivityFeed({
  items,
  type,
  className,
  emptyMessage = "No recent activity",
}: ActivityFeedProps) {
  const Icon = icons[type];

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface-1 px-6 py-12 text-center">
        <p className="text-sm text-navy-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:bg-surface-1"
        >
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              iconColors[type]
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-navy-950">
              {item.displayName}
            </p>
            <p className="text-xs text-navy-500">
              {formatRelativeTime(item.createdAt)}
            </p>
          </div>
          <p className="shrink-0 font-mono text-sm font-semibold text-navy-950">
            {formatCurrency(item.amount)}
          </p>
        </div>
      ))}
    </div>
  );
}
