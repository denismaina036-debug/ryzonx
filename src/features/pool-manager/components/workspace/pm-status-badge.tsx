import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-500/15 text-slate-800 ring-slate-500/30 dark:text-slate-200",
  pending: "bg-amber-500/20 text-amber-900 ring-amber-500/40 dark:text-amber-200",
  submitted: "bg-amber-500/20 text-amber-900 ring-amber-500/40 dark:text-amber-200",
  under_review: "bg-amber-500/20 text-amber-900 ring-amber-500/40 dark:text-amber-200",
  approved: "bg-emerald-500/20 text-emerald-900 ring-emerald-500/40 dark:text-emerald-200",
  available: "bg-emerald-500/20 text-emerald-900 ring-emerald-500/40 dark:text-emerald-200",
  operating: "bg-emerald-500/20 text-emerald-900 ring-emerald-500/40 dark:text-emerald-200",
  live: "bg-emerald-500/20 text-emerald-900 ring-emerald-500/40 dark:text-emerald-200",
  funding: "bg-sky-500/20 text-sky-900 ring-sky-500/40 dark:text-sky-200",
  trading: "bg-violet-500/20 text-violet-900 ring-violet-500/40 dark:text-violet-200",
  distribution: "bg-indigo-500/20 text-indigo-900 ring-indigo-500/40 dark:text-indigo-200",
  completed: "bg-emerald-500/15 text-emerald-800 ring-emerald-500/30 dark:text-emerald-300",
  paused: "bg-orange-500/20 text-orange-900 ring-orange-500/40 dark:text-orange-200",
  rejected: "bg-red-500/20 text-red-900 ring-red-500/40 dark:text-red-200",
  closed: "bg-slate-500/15 text-slate-700 ring-slate-500/30 dark:text-slate-300",
  archived: "bg-slate-500/10 text-slate-600 ring-slate-500/25 dark:text-slate-400",
  suspended: "bg-red-500/20 text-red-900 ring-red-500/40 dark:text-red-200",
  restricted: "bg-orange-500/20 text-orange-900 ring-orange-500/40 dark:text-orange-200",
};

export function PmStatusBadge({
  label,
  status,
  className,
  dot = true,
}: {
  label: string;
  status: string;
  className?: string;
  dot?: boolean;
}) {
  const styles = STATUS_STYLES[status] ?? "bg-[var(--id-surface-muted)] text-[var(--id-text)] ring-[var(--id-border)]";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
        styles,
        className
      )}
    >
      {dot && (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-80"
          aria-hidden
        />
      )}
      {label}
    </span>
  );
}
