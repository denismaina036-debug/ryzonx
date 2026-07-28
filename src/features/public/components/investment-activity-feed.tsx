import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleDollarSign,
  UserPlus,
  Wallet,
} from "lucide-react";
import { cn, formatCurrency, formatRelativeTime } from "@/lib/utils";
import type { LandingInvestmentActivity } from "@/domain/landing-page/types";

interface InvestmentActivityFeedProps {
  items: LandingInvestmentActivity[];
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
} as const;

export function InvestmentActivityFeed({
  items,
  className,
  emptyMessage = "No recent investment activity",
}: InvestmentActivityFeedProps) {
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
            className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:bg-surface-1 md:items-center md:gap-4"
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
              <div className="flex items-start justify-between gap-2 md:block">
                <p className="min-w-0 break-words text-sm font-medium text-navy-950 md:truncate">
                  {item.displayName}
                </p>
                <p className="shrink-0 font-mono text-sm font-semibold tabular-nums text-navy-950 md:hidden">
                  {formatCurrency(item.amount)}
                </p>
              </div>
              <p className="mt-0.5 break-words text-xs text-navy-500 md:truncate">
                {item.subtitle}
              </p>
              <p className="mt-0.5 text-xs text-navy-400">
                {formatRelativeTime(item.createdAt)}
              </p>
            </div>
            <p className="hidden shrink-0 font-mono text-sm font-semibold tabular-nums text-navy-950 md:block">
              {formatCurrency(item.amount)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
