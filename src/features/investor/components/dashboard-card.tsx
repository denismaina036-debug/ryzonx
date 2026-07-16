import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export const dashboardLabelClass =
  "text-[11px] font-medium text-[var(--id-text-muted)]";

export const dashboardValueClass =
  "font-mono text-2xl font-semibold leading-none tracking-tight text-[var(--id-text)] tabular-nums sm:text-[1.75rem]";

export const dashboardSecondaryValueClass =
  "font-mono text-lg font-medium leading-tight tracking-tight tabular-nums text-[var(--id-text-secondary)]";

export const dashboardStatValueClass =
  "mt-1 font-mono text-sm font-semibold leading-snug text-[var(--id-text)] tabular-nums";

export const dashboardCardBodyClass = "px-6 pb-6 pt-1";

type GlowVariant = "royal" | "emerald" | "violet" | "sky" | "gold";

interface DashboardCardProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  headerExtra?: ReactNode;
  headerAction?: ReactNode;
  glow?: GlowVariant;
  variant?: "default" | "flat";
}

export function DashboardCard({
  title,
  icon: Icon,
  children,
  className,
  headerExtra,
  headerAction,
  variant = "default",
}: DashboardCardProps) {
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[var(--id-radius)] bg-[var(--id-surface)] shadow-[var(--id-shadow)]",
        variant === "flat" && "bg-transparent shadow-none",
        className
      )}
    >
      <div className="relative flex items-center justify-between gap-3 px-6 pb-0 pt-5">
        <div className="flex min-w-0 items-center gap-2">
          {Icon && (
            <Icon
              className="h-4 w-4 shrink-0 text-[var(--id-text-muted)]"
              strokeWidth={1.75}
            />
          )}
          <h2 className="truncate text-sm font-semibold text-[var(--id-text)]">
            {title}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headerExtra}
          {headerAction}
        </div>
      </div>
      {children}
    </article>
  );
}

interface DashboardStatTileProps {
  label: string;
  value: string;
  sub?: string;
  valueClassName?: string;
}

export function DashboardStatTile({
  label,
  value,
  sub,
  valueClassName,
}: DashboardStatTileProps) {
  return (
    <div>
      <p className={dashboardLabelClass}>{label}</p>
      <p className={cn(dashboardStatValueClass, valueClassName)}>{value}</p>
      {sub && (
        <p className="mt-0.5 text-[11px] text-[var(--id-text-faint)]">{sub}</p>
      )}
    </div>
  );
}

export function DashboardBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "accent";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        tone === "success" && "bg-[var(--id-success-soft)] text-[var(--id-success)]",
        tone === "accent" && "bg-[var(--id-accent-soft)] text-[var(--id-accent-text)]",
        tone === "neutral" && "bg-[var(--id-surface-muted)] text-[var(--id-text-secondary)]"
      )}
    >
      {children}
    </span>
  );
}

export function DashboardProgressBar({
  value,
  glow = "royal",
}: {
  value: number;
  glow?: GlowVariant;
}) {
  const fillClass =
    glow === "emerald"
      ? "bg-[var(--id-success)]"
      : "bg-[var(--id-accent)]";

  return (
    <div className="h-1 overflow-hidden rounded-full bg-[var(--id-surface-muted)]">
      <div
        className={cn("h-full rounded-full transition-all duration-700", fillClass)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
