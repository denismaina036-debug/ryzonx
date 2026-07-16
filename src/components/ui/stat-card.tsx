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
}

export function StatCard({
  label,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:border-royal-200 hover:shadow-md",
        className
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-royal-50 text-royal-600 transition-colors group-hover:bg-royal-100">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <p className="metric-label">{label}</p>
      <p className="metric-value mt-2">{value}</p>
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
    <div className={cn("grid gap-4 md:gap-6", cols[columns], className)}>
      {children}
    </div>
  );
}

export { MetricCard };
