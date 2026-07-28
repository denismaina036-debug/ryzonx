import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion } from "@/components/ui/accordion";
import { SectionContainer, SectionHeader } from "@/components/layouts/section";
import { ROUTES } from "@/constants/routes";
import { fundService } from "@/services/fund.service";
import { landingPageService } from "@/services/landing-page.service";

export async function FaqPreviewSection() {
  const [items, content] = await Promise.all([
    fundService.getFaqItems(),
    landingPageService.getPublicContent(),
  ]);
  const preview = items.slice(0, 5);

  return (
    <SectionContainer landingMobile>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader
          badge={content.copy.faq.badge}
          title={content.copy.faq.title}
          description={content.copy.faq.description}
          className="mb-0"
        />
        <Button asChild variant="outline">
          <Link href={ROUTES.faq}>
            {content.copy.faq.viewAllLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="mt-8">
        <Accordion
          items={preview.map((f) => ({
            id: f.id,
            question: f.question,
            answer: f.answer,
          }))}
        />
      </div>
    </SectionContainer>
  );
}
