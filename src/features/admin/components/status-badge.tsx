import { Badge } from "@/components/ui/badge";
import type { TransactionStatus, TradeStatus } from "@/types";
import type { AccountStatus } from "@/features/admin/types";

const transactionStatusMap: Record<
  TransactionStatus,
  { label: string; variant: "warning" | "success" | "destructive" | "default" | "secondary" }
> = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "secondary" },
  rejected: { label: "Rejected", variant: "destructive" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "default" },
};

const tradeStatusMap: Record<
  TradeStatus,
  { label: string; variant: "warning" | "success" | "destructive" }
> = {
  open: { label: "Open", variant: "warning" },
  closed: { label: "Closed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

const accountStatusMap: Record<
  AccountStatus,
  { label: string; variant: "success" | "warning" | "destructive" }
> = {
  active: { label: "Active", variant: "success" },
  suspended: { label: "Suspended", variant: "warning" },
  frozen: { label: "Frozen", variant: "destructive" },
};

export function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  const config = transactionStatusMap[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function TradeStatusBadge({ status }: { status: TradeStatus }) {
  const config = tradeStatusMap[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  const config = accountStatusMap[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function PublishedBadge({ published }: { published: boolean }) {
  return (
    <Badge variant={published ? "success" : "default"}>
      {published ? "Published" : "Draft"}
    </Badge>
  );
}
