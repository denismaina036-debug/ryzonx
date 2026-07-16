import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPageHeader, TestimonialsTable } from "@/features/admin/components";
import { adminService } from "@/services/admin.service";

export default async function AdminTestimonialsPage() {
  const testimonials = await adminService.getTestimonials();

  return (
    <div>
      <AdminPageHeader
        title="Testimonials"
        description="Manage testimonials displayed on the public homepage."
        actions={
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Add Testimonial
          </Button>
        }
      />
      <TestimonialsTable testimonials={testimonials} />
    </div>
  );
}
