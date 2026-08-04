import type { Metadata } from "next";
import { PageHeader } from "@/components/layouts/page-header";
import { SectionContainer } from "@/components/layouts/section";
import { JournalTable } from "@/features/public/components/journal-table";
import { ROUTES } from "@/constants/routes";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { publicJournalService } from "@/services/public-journal.service";

export const metadata: Metadata = buildPageMetadata({
  title: "Trading Journal",
  description:
    "Browse every published trade on RyvonX with full transparency into trading activity and results.",
  path: ROUTES.journal,
  keywords: ["trading journal", "trade history", "transparent trading", "RyvonX"],
});

export default async function JournalPage() {
  const trades = await publicJournalService.listTrades();

  return (
    <SectionContainer className="!py-8 md:!py-12">
      <PageHeader
        title="Trading Journal"
        description="Every closed trade from active pool cycles is verified, published, and attributed to its pool manager."
      />
      <JournalTable trades={trades} />
    </SectionContainer>
  );
}
