import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function PmFundingProgress({
  raised,
  target,
  investorCount,
  className,
  compact = false,
}: {
  raised: number;
  target: number | null;
  investorCount?: number;
  className?: string;
  compact?: boolean;
}) {
  const pct =
    target != null && target > 0 ? Math.min(100, Math.round((raised / target) * 1000) / 10) : null;

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--id-text-faint)]">
            Raised
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
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--id-text-faint)]">
              Target
            </p>
            <p className={cn("font-semibold tabular-nums text-[var(--id-text)]", compact ? "text-base" : "text-lg")}>
              {formatCurrency(target)}
            </p>
          </div>
        )}
      </div>

      {pct != null && (
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

      {target == null || target <= 0 ? (
        <p className="text-xs text-[var(--id-text-muted)]">
          {investorCount != null
            ? `${investorCount} investor${investorCount === 1 ? "" : "s"} committed`
            : "No target capital set"}
        </p>
      ) : null}
    </div>
  );
}
