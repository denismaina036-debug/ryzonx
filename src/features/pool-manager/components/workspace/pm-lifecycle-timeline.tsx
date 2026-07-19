import { INVESTMENT_CYCLE_LIFECYCLE_ORDER, INVESTMENT_CYCLE_STATUS_LABELS } from "@/constants/investment-cycle";
import type { InvestmentCycleStatus } from "@/constants/investment-cycle";
import { STRATEGY_STATUSES, STRATEGY_STATUS_LABELS } from "@/constants/strategy";
import type { StrategyStatus } from "@/constants/strategy";
import { cn } from "@/lib/utils";

export function PmCycleLifecycleTimeline({ currentStatus }: { currentStatus: InvestmentCycleStatus }) {
  const currentIndex = INVESTMENT_CYCLE_LIFECYCLE_ORDER.indexOf(currentStatus);

  return (
    <ol className="space-y-0">
      {INVESTMENT_CYCLE_LIFECYCLE_ORDER.map((status, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex h-3 w-3 rounded-full ring-2",
                  done && "bg-emerald-400 ring-emerald-400/30",
                  active && "bg-amber-400 ring-amber-400/40",
                  !done && !active && "bg-navy-700 ring-navy-600"
                )}
              />
              {index < INVESTMENT_CYCLE_LIFECYCLE_ORDER.length - 1 && (
                <span
                  className={cn(
                    "my-1 w-px flex-1 min-h-[1.25rem]",
                    done ? "bg-emerald-500/40" : "bg-white/[0.08]"
                  )}
                />
              )}
            </div>
            <div className={cn("pb-4", index === INVESTMENT_CYCLE_LIFECYCLE_ORDER.length - 1 && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-medium",
                  active ? "text-amber-200" : done ? "text-emerald-300/90" : "text-navy-500"
                )}
              >
                {INVESTMENT_CYCLE_STATUS_LABELS[status]}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function PmStrategyLifecycleTimeline({ currentStatus }: { currentStatus: StrategyStatus }) {
  const currentIndex = STRATEGY_STATUSES.indexOf(currentStatus);

  return (
    <ol className="flex flex-wrap gap-2">
      {STRATEGY_STATUSES.map((status, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li
            key={status}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset",
              done && "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20",
              active && "bg-amber-500/15 text-amber-200 ring-amber-500/30",
              !done && !active && "bg-white/[0.03] text-navy-500 ring-white/[0.06]"
            )}
          >
            {STRATEGY_STATUS_LABELS[status]}
          </li>
        );
      })}
    </ol>
  );
}
