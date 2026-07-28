import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricCard } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  className?: string;
  /** Tighter mobile carousel layout with scaled-down values. */
  compact?: boolean;
}

export function StatCard({
  label,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  className,
  compact = false,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:border-royal-200 hover:shadow-md",
        compact ? "p-3" : "p-4 md:p-6",
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-xl bg-royal-50 text-royal-600 transition-colors group-hover:bg-royal-100",
            compact
              ? "mb-1.5 h-7 w-7"
              : "mb-2 h-8 w-8 md:mb-4 md:h-10 md:w-10"
          )}
        >
          <Icon className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4 md:h-5 md:w-5")} />
        </div>
      )}
      <p className={cn("metric-label", compact && "text-[10px] leading-tight")}>{label}</p>
      <p
        className={cn(
          compact
            ? "mt-1 break-words font-mono text-base font-semibold leading-tight tracking-tight text-navy-950 tabular-nums"
            : "metric-value mt-1 md:mt-2"
        )}
      >
        {value}
      </p>
      {change && (
        <p
          className={cn(
            "mt-1.5 text-sm font-medium",
            changeType === "positive" && "text-emerald-600",
            changeType === "negative" && "text-red-600",
            changeType === "neutral" && "text-navy-500"
          )}
        >
          {change}
        </p>
      )}
    </div>
  );
}

interface StatGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 6;
  className?: string;
}

export function StatGrid({ children, columns = 3, className }: StatGridProps) {
  const cols = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
    6: "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
  };

  return (
    <div className={cn("grid gap-3 md:gap-6", cols[columns], className)}>
      {children}
    </div>
  );
}

export { MetricCard };
