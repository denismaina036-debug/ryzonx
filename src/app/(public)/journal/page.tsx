import type { Metadata } from "next";
import { PageHeader } from "@/components/layouts/page-header";
import { SectionContainer } from "@/components/layouts/section";
import { JournalTable } from "@/features/public/components/journal-table";
import { ROUTES } from "@/constants/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Trading Journal",
  description:
    "Browse every published trade on RyvonX with full transparency into trading activity and results.",
  path: ROUTES.journal,
  keywords: ["trading journal", "trade history", "transparent trading", "RyvonX"],
});

export default function JournalPage() {
  return (
    <SectionContainer className="!py-8 md:!py-12">
      <PageHeader
        title="Trading Journal"
        description="Every trade is verified, published, and available for public review. Full transparency into our trading activity."
      />
      <JournalTable />
    </SectionContainer>
  );
}
