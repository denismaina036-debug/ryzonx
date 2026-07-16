import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPageHeader, TransactionsTable } from "@/features/admin/components";
import { adminService } from "@/services/admin.service";

export default async function AdminTransactionsPage() {
  const transactions = await adminService.getTransactions();

  return (
    <div>
      <AdminPageHeader
        title="Transaction Center"
        description="Master ledger of all deposits, withdrawals, investments, and adjustments."
        actions={
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4" />
            Export
          </Button>
        }
      />
      <TransactionsTable transactions={transactions} />
    </div>
  );
}
