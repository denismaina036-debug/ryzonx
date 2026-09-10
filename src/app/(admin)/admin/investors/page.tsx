import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPageHeader, InvestorsTable } from "@/features/admin/components";
import { adminDirectoryService } from "@/services/admin-directory.service";

export default async function AdminInvestorsPage() {
  const investors = await adminDirectoryService.investors();

  return (
    <div>
      <AdminPageHeader
        title="Investors"
        description="All active investors and their current capital by pool. Totals exclude returned capital and pending or rejected allocations."
        actions={
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4" />
            Export
          </Button>
        }
      />
      <InvestorsTable investors={investors} />
    </div>
  );
}
