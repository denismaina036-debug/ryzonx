import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function PmFundingProgress({
  raised,
  target,
  investorCount,
  className,
  compact = false,
  mode = "funding",
}: {
  raised: number;
  target: number | null;
  investorCount?: number;
  className?: string;
  compact?: boolean;
  mode?: "funding" | "trading";
}) {
  const isTrading = mode === "trading";
  const primaryLabel = isTrading ? "Capital Traded" : "Raised";
  const secondaryLabel = isTrading ? "Total Capital Under Management" : "Target";
  const pct =
    !isTrading && target != null && target > 0
      ? Math.min(100, Math.round((raised / target) * 1000) / 10)
      : null;

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--id-text-faint)]">
            {primaryLabel}
          </p>
          <p
            className={cn(
              "font-semibold tabular-nums text-[var(--id-text)]",
              compact ? "text-lg" : "text-2xl"
            )}
          >
            {formatCurrency(raised)}
          </p>
        </div>
        {target != null && target > 0 && (
          <div className={isTrading ? "text-left sm:text-right" : "text-right"}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--id-text-faint)]">
              {secondaryLabel}
            </p>
            <p
              className={cn(
                "font-semibold tabular-nums text-[var(--id-text)]",
                compact ? "text-base" : "text-lg"
              )}
            >
              {formatCurrency(target)}
            </p>
          </div>
        )}
      </div>

      {!isTrading && pct != null && (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--id-surface-muted)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-[var(--id-text-muted)]">
            {pct}% of target
            {investorCount != null
              ? ` · ${investorCount} investor${investorCount === 1 ? "" : "s"}`
              : ""}
          </p>
        </div>
      )}

      {isTrading && investorCount != null && (
        <p className="text-xs text-[var(--id-text-muted)]">
          {investorCount} investor{investorCount === 1 ? "" : "s"} in this cycle
        </p>
      )}

      {!isTrading && (target == null || target <= 0) ? (
        <p className="text-xs text-[var(--id-text-muted)]">
          {investorCount != null
            ? `${investorCount} investor${investorCount === 1 ? "" : "s"} committed`
            : "No target capital set"}
        </p>
      ) : null}
    </div>
  );
}
