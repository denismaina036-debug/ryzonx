import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function LiveTradingBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        active
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-[var(--id-border)] text-[var(--id-text-muted)]"
      )}
    >
      <Activity
        className={cn("h-3.5 w-3.5", active && "animate-pulse")}
        strokeWidth={2.5}
      />
      Live
    </span>
  );
}
