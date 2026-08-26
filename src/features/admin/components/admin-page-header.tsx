import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function AdminPageHeader({
  title,
  description,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy-950 md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-navy-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

interface AdminMetricCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  className?: string;
}

export function AdminMetricCard({
  label,
  value,
  icon: Icon,
  change,
  changeType = "neutral",
  className,
}: AdminMetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--id-radius)] border border-border bg-card/95 p-5 shadow-[var(--id-shadow)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--id-shadow-lg)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-navy-500">
          {label}
        </p>
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-royal-50 text-royal-600">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <p className="mt-3 font-mono text-2xl font-semibold tracking-tight text-navy-950">
        {value}
      </p>
      {change && (
        <p
          className={cn(
            "mt-1 text-xs font-medium",
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

interface AdminMetricGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 6;
  className?: string;
}

export function AdminMetricGrid({
  children,
  columns = 4,
  className,
}: AdminMetricGridProps) {
  const colClass = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
    6: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
  }[columns];

  return (
    <div className={cn("grid gap-4", colClass, className)}>{children}</div>
  );
}
