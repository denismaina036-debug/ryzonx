import { notFound } from "next/navigation";
import { WithdrawalsTable } from "@/features/admin/components";
import { AdminFinanceShell } from "@/features/admin/components/admin-finance-shell";
import { AdminStatusNav } from "@/features/admin/components/admin-sub-nav";
import { FINANCE_STATUS_NAV } from "@/features/admin/constants/nav";
import type { FinanceTransactionStatus } from "@/constants/routes";
import { adminService } from "@/services/admin.service";

const VALID_STATUSES: FinanceTransactionStatus[] = ["pending", "approved", "rejected", "all"];

interface PageProps {
  params: Promise<{ status: string }>;
}

export default async function AdminFinanceWithdrawalsPage({ params }: PageProps) {
  const { status } = await params;
  if (!VALID_STATUSES.includes(status as FinanceTransactionStatus)) {
    notFound();
  }

  const filter = status as FinanceTransactionStatus;
  const [all, pending, approved, rejected, withdrawals] = await Promise.all([
    adminService.getWithdrawals(),
    adminService.getWithdrawals("pending"),
    adminService.getWithdrawals("approved"),
    adminService.getWithdrawals("rejected"),
    filter === "all" ? adminService.getWithdrawals() : adminService.getWithdrawals(filter),
  ]);

  const counts = {
    pending: pending.length,
    approved: approved.length,
    rejected: rejected.length,
    all: all.length,
  };

  return (
    <AdminFinanceShell
      title="Withdrawals"
      description="Review and approve withdrawal requests. Approving deducts from available balance."
      statusNav={
        <AdminStatusNav
          basePath="/admin/finance/withdrawals"
          currentStatus={filter}
          items={FINANCE_STATUS_NAV.map((item) => ({
            ...item,
            count: counts[item.status],
          }))}
        />
      }
    >
      <WithdrawalsTable withdrawals={withdrawals} />
    </AdminFinanceShell>
  );
}
