import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminModuleShell } from "@/features/admin/components";

export default function AdminUsersPage() {
  return (
    <AdminModuleShell
      title="System Users"
      description="Manage administrator accounts. Architecture supports additional admin roles in the future."
      actions={
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Add Admin
        </Button>
      }
      comingSoon
    />
  );
}
