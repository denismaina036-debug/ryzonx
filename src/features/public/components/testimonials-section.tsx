import { SectionContainer, SectionHeader } from "@/components/layouts/section";
import { TestimonialGrid } from "@/components/ui/testimonial-card";
import { fundService } from "@/services/fund.service";
import { landingPageService } from "@/services/landing-page.service";

export async function TestimonialsSection() {
  const [testimonials, content] = await Promise.all([
    fundService.getTestimonials(),
    landingPageService.getPublicContent(),
  ]);

  return (
    <SectionContainer className="bg-surface-1">
      <SectionHeader
        badge={content.copy.testimonials.badge}
        title={content.copy.testimonials.title}
        description={content.copy.testimonials.description}
        align="center"
      />
      <TestimonialGrid testimonials={testimonials} />
    </SectionContainer>
  );
}
