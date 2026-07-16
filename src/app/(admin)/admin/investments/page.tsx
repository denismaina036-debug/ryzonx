import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminModuleShell } from "@/features/admin/components";

export default function AdminInvestmentsPage() {
  return (
    <AdminModuleShell
      title="Investments"
      description="Create, edit, pause, close, and transfer investments between funds."
      actions={
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Create Investment
        </Button>
      }
      comingSoon
    />
  );
}
