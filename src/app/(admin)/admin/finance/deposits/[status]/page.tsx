import { notFound } from "next/navigation";
import { DepositsTable } from "@/features/admin/components";
import { AdminFinanceShell } from "@/features/admin/components/admin-finance-shell";
import { AdminStatusNav } from "@/features/admin/components/admin-sub-nav";
import { FINANCE_STATUS_NAV } from "@/features/admin/constants/nav";
import type { FinanceTransactionStatus } from "@/constants/routes";
import { adminService } from "@/services/admin.service";

const VALID_STATUSES: FinanceTransactionStatus[] = ["pending", "approved", "rejected", "all"];

interface PageProps {
  params: Promise<{ status: string }>;
}

export default async function AdminFinanceDepositsPage({ params }: PageProps) {
  const { status } = await params;
  if (!VALID_STATUSES.includes(status as FinanceTransactionStatus)) {
    notFound();
  }

  const filter = status as FinanceTransactionStatus;
  const [all, pending, approved, rejected, deposits] = await Promise.all([
    adminService.getDeposits(),
    adminService.getDeposits("pending"),
    adminService.getDeposits("approved"),
    adminService.getDeposits("rejected"),
    filter === "all" ? adminService.getDeposits() : adminService.getDeposits(filter),
  ]);

  const counts = {
    pending: pending.length,
    approved: approved.length,
    rejected: rejected.length,
    all: all.length,
  };

  return (
    <AdminFinanceShell
      title="Deposits"
      description="Review and approve deposit requests. Approving credits available balance so investors can choose a pool."
      statusNav={
        <AdminStatusNav
          basePath="/admin/finance/deposits"
          currentStatus={filter}
          items={FINANCE_STATUS_NAV.map((item) => ({
            ...item,
            count: counts[item.status],
          }))}
        />
      }
    >
      <DepositsTable deposits={deposits} />
    </AdminFinanceShell>
  );
}
