import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { pmCardClass, pmStatLabelClass, pmStatValueClass } from "@/features/pool-manager/constants/ui";

const ACCENT_STYLES: Record<string, string> = {
  amber: "text-[var(--pm-accent-text)]",
  indigo: "text-[var(--id-accent-text)]",
  success: "text-[var(--id-success)]",
  muted: "text-[var(--id-text-muted)]",
};

export function PmStatCard({
  label,
  value,
  icon: Icon,
  accent = "amber",
  className,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: keyof typeof ACCENT_STYLES | string;
  className?: string;
}) {
  const accentClass = ACCENT_STYLES[accent] ?? accent;

  return (
    <div className={cn(pmCardClass, "p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={pmStatLabelClass}>{label}</p>
          <p className={cn("mt-2 truncate", pmStatValueClass)}>{value}</p>
        </div>
        <div className="rounded-xl bg-[var(--id-surface-hover)] p-2">
          <Icon className={cn("h-4 w-4 shrink-0", accentClass)} />
        </div>
      </div>
    </div>
  );
}
