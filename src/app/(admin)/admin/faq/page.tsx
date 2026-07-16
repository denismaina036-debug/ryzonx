import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPageHeader, FaqTable } from "@/features/admin/components";
import { adminService } from "@/services/admin.service";

export default async function AdminFaqPage() {
  const items = await adminService.getFaqItems();

  return (
    <div>
      <AdminPageHeader
        title="FAQ Management"
        description="All FAQs are managed here — no hardcoded content on the public site."
        actions={
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Add FAQ
          </Button>
        }
      />
      <FaqTable items={items} />
    </div>
  );
}
