import { copyTradingText } from "@/lib/copy-trading-presentation";
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
    "Frequently asked questions about copying with RyvonX, copy trading, withdrawals, and fund transparency.",
  path: ROUTES.faq,
  keywords: ["RyvonX FAQ", "copy allocation questions", "copy trading FAQ"],
});

export default async function FaqPage() {
  const items = await fundService.getFaqItems();

  return (
    <SectionContainer className="!py-8 md:!py-12">
      <PageHeader
        title="Frequently Asked Questions"
        description="Everything you need to know about Ryvonx, our copy allocation process, and fund transparency."
      />
      <div className="mx-auto max-w-3xl">
        <Accordion
          items={items.map((f) => ({
            id: f.id,
            question: copyTradingText(f.question),
            answer: copyTradingText(f.answer),
          }))}
        />
      </div>
    </SectionContainer>
  );
}
