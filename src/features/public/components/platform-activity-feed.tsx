import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleDollarSign,
  UserPlus,
  Wallet,
} from "lucide-react";
import { cn, formatCurrency, formatRelativeTime } from "@/lib/utils";
import type { PlatformFeedItem } from "@/services/public-activity.service";

interface PlatformActivityFeedProps {
  items: PlatformFeedItem[];
  className?: string;
  emptyMessage?: string;
}

const iconConfig = {
  pool_join: { icon: UserPlus, className: "bg-royal-50 text-royal-600" },
  deposit: { icon: ArrowDownToLine, className: "bg-emerald-50 text-emerald-600" },
  withdrawal: { icon: ArrowUpFromLine, className: "bg-gold-50 text-gold-600" },
  investment_confirmed: { icon: Wallet, className: "bg-royal-50 text-royal-600" },
  pool_settlement: { icon: CircleDollarSign, className: "bg-emerald-50 text-emerald-600" },
  profit_distribution: { icon: CircleDollarSign, className: "bg-gold-50 text-gold-600" },
  platform_event: { icon: Activity, className: "bg-surface-2 text-navy-600" },
} as const;

export function PlatformActivityFeed({
  items,
  className,
  emptyMessage = "No recent platform activity",
}: PlatformActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface-1 px-6 py-12 text-center">
        <p className="text-sm text-navy-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => {
        const config = iconConfig[item.activityType];
        const Icon = config.icon;
        return (
          <div
            key={item.id}
            className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:bg-surface-1"
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                config.className
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-navy-950">{item.displayName}</p>
              <p className="truncate text-xs text-navy-500">{item.subtitle}</p>
              <p className="text-xs text-navy-400">{formatRelativeTime(item.createdAt)}</p>
            </div>
            {item.amount != null && item.amount > 0 ? (
              <p className="shrink-0 font-mono text-sm font-semibold text-navy-950">
                {formatCurrency(item.amount)}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
