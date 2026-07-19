import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-navy-500/20 text-navy-300 ring-navy-500/30",
  submitted: "bg-sky-500/15 text-sky-200 ring-sky-500/25",
  under_review: "bg-violet-500/15 text-violet-200 ring-violet-500/25",
  approved: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/25",
  available: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/25",
  operating: "bg-amber-500/15 text-amber-200 ring-amber-500/25",
  paused: "bg-orange-500/15 text-orange-200 ring-orange-500/25",
  funding: "bg-cyan-500/15 text-cyan-200 ring-cyan-500/25",
  trading: "bg-amber-500/15 text-amber-200 ring-amber-500/25",
  distribution: "bg-indigo-500/15 text-indigo-200 ring-indigo-500/25",
  completed: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20",
  archived: "bg-navy-500/10 text-navy-400 ring-navy-500/20",
};

export function PmStatusBadge({
  label,
  status,
  className,
}: {
  label: string;
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        STATUS_STYLES[status] ?? "bg-white/5 text-navy-300 ring-white/10",
        className
      )}
    >
      {label}
    </span>
  );
}
