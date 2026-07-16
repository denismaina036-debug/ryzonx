import { Badge } from "@/components/ui/badge";
import type { InvestorTradeDisplayStatus } from "@/features/investor/types";

const statusConfig: Record<
  InvestorTradeDisplayStatus,
  { label: string; className: string }
> = {
  running: {
    label: "Running",
    className: "bg-[var(--id-success-soft)] text-[var(--id-success)] ring-[var(--id-success)]/20",
  },
  breakeven: {
    label: "Breakeven",
    className: "bg-sky-500/10 text-sky-400 ring-sky-500/20",
  },
  partials_taken: {
    label: "Partials Taken",
    className: "bg-orange-500/10 text-orange-400 ring-orange-500/20",
  },
  take_profit_hit: {
    label: "Take Profit Hit",
    className: "bg-[var(--id-success-soft)] text-[var(--id-success)] ring-[var(--id-success)]/20",
  },
  stop_loss_hit: {
    label: "Stop Loss Hit",
    className: "bg-red-500/10 text-[var(--id-danger)] ring-red-500/20",
  },
  closed: {
    label: "Closed",
    className: "bg-[var(--id-surface-muted)] text-[var(--id-text-secondary)] ring-[var(--id-border)]",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-[var(--id-surface-muted)] text-[var(--id-text-muted)] ring-[var(--id-border)]",
  },
};

export function InvestorTradeStatusBadge({
  status,
}: {
  status: InvestorTradeDisplayStatus;
}) {
  const config = statusConfig[status];
  return (
    <Badge
      variant="secondary"
      className={`rounded-full border-0 px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${config.className}`}
    >
      {config.label}
    </Badge>
  );
}
