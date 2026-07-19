import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function PmFundingProgress({
  raised,
  target,
  investorCount,
  className,
}: {
  raised: number;
  target: number | null;
  investorCount: number;
  className?: string;
}) {
  const pct =
    target != null && target > 0 ? Math.min(100, Math.round((raised / target) * 1000) / 10) : null;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-navy-500">Raised</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(raised)}</p>
        </div>
        {target != null && (
          <div className="text-right">
            <p className="text-xs text-navy-500">Target</p>
            <p className="text-lg font-semibold text-navy-200">{formatCurrency(target)}</p>
          </div>
        )}
      </div>

      {pct != null && (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-navy-400">
            {pct}% funded · {investorCount} investor{investorCount === 1 ? "" : "s"}
          </p>
        </div>
      )}

      {target == null && (
        <p className="text-xs text-navy-400">
          {investorCount} investor{investorCount === 1 ? "" : "s"} committed
        </p>
      )}
    </div>
  );
}
