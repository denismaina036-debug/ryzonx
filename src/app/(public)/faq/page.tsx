import type { Metadata } from "next";
import { PageHeader } from "@/components/layouts/page-header";
import { SectionContainer } from "@/components/layouts/section";
import { Accordion } from "@/components/ui/accordion";
import { ROUTES } from "@/constants/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { fundService } from "@/services/fund.service";

export const metadata: Metadata = buildPageMetadata({
  title: "FAQ",
  description:
    "Frequently asked questions about investing with RyvonX, pool trading, withdrawals, and fund transparency.",
  path: ROUTES.faq,
  keywords: ["RyvonX FAQ", "investment questions", "pool trading FAQ"],
});

export default async function FaqPage() {
  const items = await fundService.getFaqItems();

  return (
    <SectionContainer className="!py-8 md:!py-12">
      <PageHeader
        title="Frequently Asked Questions"
        description="Everything you need to know about Ryvonx, our investment process, and fund transparency."
      />
      <div className="mx-auto max-w-3xl">
        <Accordion
          items={items.map((f) => ({
            id: f.id,
            question: f.question,
            answer: f.answer,
          }))}
        />
      </div>
    </SectionContainer>
  );
}
