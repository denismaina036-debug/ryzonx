import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPageHeader, InvestorsTable } from "@/features/admin/components";
import { adminService } from "@/services/admin.service";

export default async function AdminInvestorsPage() {
  const investors = await adminService.getInvestors();

  return (
    <div>
      <AdminPageHeader
        title="Investors"
        description="Search, filter, and manage all investor accounts and portfolios."
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
