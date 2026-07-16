import { SectionContainer, SectionHeader } from "@/components/layouts/section";
import { TestimonialGrid } from "@/components/ui/testimonial-card";
import { fundService } from "@/services/fund.service";

export async function TestimonialsSection() {
  const testimonials = await fundService.getTestimonials();

  return (
    <SectionContainer className="bg-surface-1">
      <SectionHeader
        badge="Testimonials"
        title="What Our Investors Say"
        description="Hear from members of the Ryvonx community."
        align="center"
      />
      <TestimonialGrid testimonials={testimonials} />
    </SectionContainer>
  );
}
