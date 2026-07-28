import { cn } from "@/lib/utils";

export function TransactionStatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const styles: Record<string, string> = {
    completed: "bg-[var(--id-success-soft)] text-[var(--id-success)]",
    approved: "bg-[var(--id-success-soft)] text-[var(--id-success)]",
    pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    processing: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    rejected: "bg-red-500/10 text-[var(--id-danger)]",
    failed: "bg-red-500/10 text-[var(--id-danger)]",
    cancelled: "bg-[var(--id-surface-muted)] text-[var(--id-text-muted)]",
  };

  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        styles[normalized] ?? "bg-[var(--id-surface-muted)] text-[var(--id-text-muted)]"
      )}
    >
      {label}
    </span>
  );
}
